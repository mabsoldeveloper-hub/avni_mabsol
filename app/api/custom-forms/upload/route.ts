import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Limit maximum file size to 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds maximum size limit of 10MB" },
        { status: 400 }
      );
    }

    // Restrict to safe document and image formats
    const rawExt = (file.name.split(".").pop() || "").toLowerCase().trim();
    const ALLOWED_EXTENSIONS = new Set([
      "png", "jpg", "jpeg", "webp", "gif",
      "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"
    ]);

    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Only standard documents and images are allowed." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "custom-forms");
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${uuidv4()}.${rawExt}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/custom-forms/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err: any) {
    console.error("Error uploading file:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
