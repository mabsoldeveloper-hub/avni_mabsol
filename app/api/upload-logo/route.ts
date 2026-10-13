import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";

import { withAuth } from "@/app/api/_middlewares/auth.middleware";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, props: any) {
  return withAuth(async (req) => {
    try {
      const data = await req.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file selected" },
        { status: 400 }
      );
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Logo file size must be less than 5MB" },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const allowedExts = ["png", "jpg", "jpeg", "webp", "svg", "ico"];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { success: false, message: "Please upload a valid image (PNG, JPG, JPEG, WEBP, SVG)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${uuid()}.${ext}`;

    const mime =
      file.type ||
      (ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : ext === "svg"
        ? "image/svg+xml"
        : "image/jpeg");
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    // Target upload locations (primary public and standalone production fallback)
    const primaryDir = path.join(process.cwd(), "public", "uploads", "company");
    const standaloneDir = path.join(process.cwd(), ".next", "standalone", "public", "uploads", "company");

    let savedToDisk = false;
    try {
      await mkdir(primaryDir, { recursive: true });
      await writeFile(path.join(primaryDir, fileName), buffer);
      savedToDisk = true;

      // If standalone production directory exists, copy there too
      if (fs.existsSync(path.join(process.cwd(), ".next", "standalone"))) {
        try {
          await mkdir(standaloneDir, { recursive: true });
          await writeFile(path.join(standaloneDir, fileName), buffer);
        } catch {
          // Non-critical if standalone doesn't exist yet
        }
      }
    } catch (fsErr) {
      console.warn("Could not write logo to disk filesystem, falling back to Data URL:", fsErr);
    }

    // Return the URL and dataUrl fallback
    const publicUrl = savedToDisk ? `/uploads/company/${fileName}` : dataUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      dataUrl,
      fileName,
    });
    } catch (err: any) {
      console.error("Logo upload error:", err);
      return NextResponse.json(
        {
          success: false,
          message: err.message || "Upload Failed",
        },
        {
          status: 500,
        }
      );
    }
  }, { requireAdmin: true })(request, props);
}