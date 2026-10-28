import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_TYPE } from "@/lib/constants/roles.constant";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const isSuperAdmin = user.roleType === ROLE_TYPE.SUPER_ADMIN;
    if (!isSuperAdmin) {
      const { searchParams } = new URL(req.url);
      const activeCompanyId =
        req.headers.get("x-company-id") ||
        searchParams.get("activeCompanyId") ||
        searchParams.get("companyId");

      const userCompany = user.companyId ? await Company.findById(user.companyId) : null;
      let activeCompany = userCompany;
      if (activeCompanyId) {
        activeCompany = await Company.findById(activeCompanyId);
      }

      // If operating in child branch context: can only access itself
      if (activeCompany && !activeCompany.isHeadOffice && String(company._id) !== String(activeCompany._id)) {
        return NextResponse.json(
          { error: "Access denied: Branch cannot access parent or other company details" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const targetCompany = await Company.findById(id);
    if (!targetCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const data = await req.json();
    const isSuperAdmin = user.roleType === ROLE_TYPE.SUPER_ADMIN;

    const { searchParams } = new URL(req.url);
    const activeCompanyId =
      req.headers.get("x-company-id") ||
      searchParams.get("activeCompanyId") ||
      data.activeCompanyId;

    const userCompany = user.companyId ? await Company.findById(user.companyId) : null;
    let activeCompany = userCompany;
    if (activeCompanyId) {
      activeCompany = await Company.findById(activeCompanyId);
    }

    const isSelfEdit = Boolean(activeCompany && String(activeCompany._id) === String(targetCompany._id));
    const isHOEditingChild = Boolean(
      activeCompany?.isHeadOffice &&
      targetCompany.parentCompanyId &&
      String(targetCompany.parentCompanyId) === String(activeCompany._id) &&
      !isSelfEdit
    );

    // Security & Authorization Rules:
    if (!isSuperAdmin) {
      // 1. If operating in child branch context:
      if (activeCompany && !activeCompany.isHeadOffice) {
        // Child branch CANNOT edit parent or sibling companies
        if (String(targetCompany._id) !== String(activeCompany._id)) {
          return NextResponse.json(
            { error: "Access denied: Branch company cannot edit the parent or other companies" },
            { status: 403 }
          );
        }

        // Child branch editing itself:
        // CANNOT change email, password, enabledModules, isHeadOffice, parentCompanyId, status, companyCode
        delete data.email;
        delete data.password;
        delete data.enabledModules;
        delete data.isHeadOffice;
        delete data.parentCompanyId;
        delete data.status;
        delete data.companyCode;
      } else if (isSelfEdit) {
        // Head Office editing itself:
        // Cannot change its own login email or system codes from here
        delete data.email;
        delete data.password;
        delete data.isHeadOffice;
        delete data.parentCompanyId;
        delete data.companyCode;
      } else if (!isHOEditingChild) {
        // Not SuperAdmin, not self-edit, and not parent HO editing its child branch
        return NextResponse.json(
          { error: "Access denied: Unauthorized to edit this company" },
          { status: 403 }
        );
      }
    }

    // 2. Head Office editing its Child Branch OR Super Admin editing any branch:
    // Fully authorized to update email and reset password!
    if (isSuperAdmin || isHOEditingChild) {
      const newEmail = data.email ? String(data.email).toLowerCase().trim() : null;
      const newPassword = data.password ? String(data.password).trim() : null;

      if (newEmail || newPassword) {
        // Find existing Administrator User for this branch
        let companyUser = await User.findOne({ companyId: targetCompany._id });
        if (!companyUser && targetCompany.email) {
          companyUser = await User.findOne({ email: String(targetCompany.email).toLowerCase().trim() });
        }

        if (newEmail && newEmail !== targetCompany.email) {
          // Verify email is not already taken by another account
          const existing = await User.findOne({
            email: newEmail,
            ...(companyUser?._id ? { _id: { $ne: companyUser._id } } : {}),
          });
          if (existing) {
            return NextResponse.json(
              { error: `The email address "${newEmail}" is already registered to another account` },
              { status: 400 }
            );
          }

          data.email = newEmail;
          if (companyUser) {
            companyUser.email = newEmail;
          }
        }

        if (newPassword && newPassword.length >= 6) {
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          if (companyUser) {
            companyUser.password = hashedPassword;
          }
        }

        if (companyUser) {
          await companyUser.save();
        }
      }
    }

    // Always strip immutable internal fields
    delete data._id;
    delete data.tenantId;
    delete data.password; // Do not store plaintext password in Company document

    const updated = await Company.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy: user?._id || undefined,
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      company: updated,
    });
  } catch (error: any) {
    console.error("PUT company error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const targetCompany = await Company.findById(id);
    if (!targetCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 1. Head Office company can NEVER be deleted
    if (targetCompany.isHeadOffice) {
      return NextResponse.json(
        { error: "Head Office company cannot be deleted" },
        { status: 403 }
      );
    }

    const isSuperAdmin = user.roleType === ROLE_TYPE.SUPER_ADMIN;
    const { searchParams } = new URL(req.url);
    const activeCompanyId =
      req.headers.get("x-company-id") ||
      searchParams.get("activeCompanyId");

    const userCompany = user.companyId ? await Company.findById(user.companyId) : null;
    let activeCompany = userCompany;
    if (activeCompanyId) {
      activeCompany = await Company.findById(activeCompanyId);
    }

    // 2. Branch companies are NEVER permitted to delete any companies
    if (!isSuperAdmin) {
      if (activeCompany && !activeCompany.isHeadOffice) {
        return NextResponse.json(
          { error: "Branch companies are not authorized to delete companies" },
          { status: 403 }
        );
      }

      // Check tenant/ownership
      if (
        String(targetCompany.parentCompanyId) !== String(activeCompany?._id) &&
        targetCompany.tenantId !== user.tenantId
      ) {
        return NextResponse.json(
          { error: "Unauthorized to delete this company" },
          { status: 403 }
        );
      }
    }

    await Company.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}