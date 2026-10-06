import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import UserPermission from "@/models/UserPermission";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const userId = body?.userId;
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions
      : [];

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required",
        },
        { status: 400 }
      );
    }

    /*
     * Remove the user's previous permission settings.
     *
     * We save the complete permission state again below.
     */
    await UserPermission.deleteMany({
      userId,
    });

    /*
     * Save permissions.
     *
     * allow: true  = permission explicitly allowed
     * allow: false = permission explicitly denied
     *
     * IMPORTANT:
     * Frontend should send BOTH checked and unchecked permissions.
     */
    if (permissions.length > 0) {
      const permissionDocuments = permissions
        .filter((permission: any) => permission?.permissionId)
        .map((permission: any) => ({
          userId,
          permissionId: permission.permissionId,
          allow: permission.allow === true,
        }));

      if (permissionDocuments.length > 0) {
        await UserPermission.insertMany(permissionDocuments);
      }
    }

    return NextResponse.json({
      success: true,
      message: "User permissions saved successfully",
    });
  } catch (error: any) {
    console.error("USER PERMISSION SAVE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to save user permissions",
      },
      {
        status: 500,
      }
    );
  }
}