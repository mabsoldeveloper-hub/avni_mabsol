import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// ======================
// GET SINGLE USER
// ======================

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {

    await connectDB();

    const { id } = await params;

    const user: any =
      await User.findById(id)
        .populate(
          "companyId",
          "companyName"
        )
        .populate(
          "roleId",
          "roleName"
        )
        .lean();

    if (!user) {

      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );

    }

    const SalesHierarchy = (await import("@/models/SalesHierarchy")).default;
    const hierarchy = await SalesHierarchy.findOne({ userId: id, status: "Active" }).lean();

    return NextResponse.json({
      ...user,
      salesHierarchy: hierarchy || null,
    });


  } catch (error: any) {

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }
}

// ======================
// UPDATE USER
// ======================

export async function PUT(
  req: NextRequest,
  { params }: Props
) {

  try {

    await connectDB();

    const { id } = await params;

    const body =
      await req.json();

    // Uniqueness validation for updated email & mobile
    if (body.email) {
      const cleanEmail = String(body.email).toLowerCase().trim();
      const duplicateEmail = await User.findOne({
        email: cleanEmail,
        _id: { $ne: id },
      });
      if (duplicateEmail) {
        return NextResponse.json(
          { error: "This email address is already in use by another user." },
          { status: 400 }
        );
      }
      body.email = cleanEmail;
    }

    if (body.mobile) {
      const cleanMobile = String(body.mobile).replace(/\D/g, "");
      if (cleanMobile) {
        const duplicateMobile = await User.findOne({
          mobile: cleanMobile,
          _id: { $ne: id },
        });
        if (duplicateMobile) {
          return NextResponse.json(
            { error: "This mobile number is already in use by another user." },
            { status: 400 }
          );
        }
        body.mobile = cleanMobile;
      }
    }

    // Password aaye to hash karo
    if (
      body.password &&
      body.password.trim() !== ""
    ) {
      body.password =
        await bcrypt.hash(
          body.password,
          10
        );
    } else {
      delete body.password;
    }

    if (body.status) {
      const s = String(body.status).trim().toLowerCase();
      if (s === "inactive" || s === "suspended" || s === "deactivated" || s === "deactive" || s === "disabled") {
        body.isApproved = false;
        body.status = "Inactive";
      } else if (s === "active") {
        body.isApproved = true;
        body.status = "Active";
      }
    }

    const user =
      await User.findByIdAndUpdate(
        id,
        body,
        {
          new: true,
        }
      );

    // Sales Hierarchy Sync
    const SalesHierarchy = (await import("@/models/SalesHierarchy")).default;
    if (body.salesHierarchyRole && body.salesHierarchyRole !== "None" && body.salesHierarchyRole !== "") {
      let reportsToName = "";
      if (body.salesHierarchyReportsTo) {
        const parentUser = await User.findById(body.salesHierarchyReportsTo);
        if (parentUser) reportsToName = parentUser.name;
      }

      await SalesHierarchy.findOneAndUpdate(
        { userId: id },
        {
          userId: id,
          userName: user.name,
          employeeCode: user.employeeCode || "",
          roleLevel: body.salesHierarchyRole,
          state: (body.salesHierarchyState || "").trim(),
          region: (body.salesHierarchyRegion || "").trim(),
          reportsTo: body.salesHierarchyReportsTo || null,
          reportsToName,
          status: "Active",
        },
        { upsert: true, new: true }
      );
    } else if (body.salesHierarchyRole === "None") {
      await SalesHierarchy.findOneAndDelete({ userId: id });
    }

    return NextResponse.json({

      success: true,

      user,

    });


  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }

}

// ======================
// DELETE USER
// ======================

export async function DELETE(
  req: NextRequest,
  { params }: Props
) {

  try {

    await connectDB();

    const { id } =
      await params;

    await User.findByIdAndDelete(
      id
    );

    return NextResponse.json({

      success: true,

      message:
        "User Deleted",

    });

  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );

  }

}