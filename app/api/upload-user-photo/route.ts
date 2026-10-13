import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";
import { isAllowedImageExtension } from "@/app/api/_utils/sanitize";

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

      // 5MB Limit
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: "File size exceeds 5MB limit" },
          { status: 400 }
        );
      }

      const rawExt = (file.name.split(".").pop() || "").toLowerCase().trim();
      if (!isAllowedImageExtension(rawExt)) {
        return NextResponse.json(
          { success: false, message: "Only PNG, JPG, JPEG, and WEBP image formats are supported." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileName = `${uuid()}.${rawExt}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "users");
      await mkdir(uploadDir, { recursive: true });

      const uploadPath = path.join(uploadDir, fileName);
      await writeFile(uploadPath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/users/${fileName}`,
      });
    } catch (err: any) {
      console.error("[UPLOAD USER PHOTO ERROR]:", err);
      return NextResponse.json(
        {
          success: false,
          message: err?.message || "Upload Failed",
        },
        { status: 500 }
      );
    }
  })(request, props);
}