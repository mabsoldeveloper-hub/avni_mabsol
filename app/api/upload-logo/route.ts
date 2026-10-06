import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const fileName = `${uuid()}.${ext}`;

    const dirPath = path.join(process.cwd(), "public", "uploads", "company");
    const { mkdir } = await import("fs/promises");
    await mkdir(dirPath, { recursive: true });

    const uploadPath = path.join(dirPath, fileName);
    await writeFile(uploadPath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/company/${fileName}`,
    });
  } catch (err) {
    console.log(err);

    return NextResponse.json(
      {
        success: false,
        message: "Upload Failed",
      },
      {
        status: 500,
      }
    );
  }
}