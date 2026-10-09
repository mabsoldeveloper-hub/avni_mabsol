import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import {
  SUPER_ADMIN_CREDENTIALS,
  USER_APPROVAL_STATUS,
} from "@/lib/constants/superAdmin.constant";

/**
 * Safely extracts SUPER_ADMIN_PASSWORD directly from .env file to bypass
 * Next.js dotenv-expand which strips $ characters from bcrypt hashes.
 */
function getConfiguredSuperAdminPassword(): string {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("SUPER_ADMIN_PASSWORD=")) {
          const val = trimmed.slice("SUPER_ADMIN_PASSWORD=".length).trim().replace(/^["']|["']$/g, "");
          if (val) return val;
        }
      }
    }
  } catch (err) {
    // fallback
  }
  return SUPER_ADMIN_CREDENTIALS.PASSWORD;
}

/**
 * Ensures the default Super Admin user account exists with configured credentials.
 * Automatically seeds or updates the Super Admin user if missing or if password was updated.
 */
export async function ensureSuperAdminUser() {
  await connectDB();

  const email = SUPER_ADMIN_CREDENTIALS.EMAIL.toLowerCase().trim();
  let superAdmin = await User.findOne({ email });

  const rawPassword = getConfiguredSuperAdminPassword();
  const isAlreadyBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(rawPassword);

  const hashedPassword = isAlreadyBcryptHash
    ? rawPassword
    : await bcrypt.hash(rawPassword, 10);

  if (!superAdmin) {
    superAdmin = await User.create({
      name: SUPER_ADMIN_CREDENTIALS.NAME,
      email: email,
      password: hashedPassword,
      roleType: SUPER_ADMIN_CREDENTIALS.ROLE_TYPE,
      roleName: SUPER_ADMIN_CREDENTIALS.ROLE,
      role: SUPER_ADMIN_CREDENTIALS.ROLE,
      designation: "Platform Super Administrator",
      status: USER_APPROVAL_STATUS.ACTIVE,
      isApproved: true,
      isUnlimitedAccess: true,
      accessDurationDays: 9999,
      approvedAt: new Date(),
      termsAccepted: true,
    });
    // console.log(`[SuperAdmin Service] Created default Super Admin account (${email})`);
  } else {
    let needsSave = false;

    // Check if password matches configured credential (supports both hash and plaintext in env)
    if (isAlreadyBcryptHash) {
      if (superAdmin.password !== rawPassword) {
        superAdmin.password = rawPassword;
        needsSave = true;
      }
    } else {
      const isPassMatch = await bcrypt.compare(
        rawPassword,
        superAdmin.password
      );
      if (!isPassMatch) {
        superAdmin.password = hashedPassword;
        needsSave = true;
      }
    }

    if (!superAdmin.isApproved || superAdmin.status !== USER_APPROVAL_STATUS.ACTIVE) {
      superAdmin.isApproved = true;
      superAdmin.status = USER_APPROVAL_STATUS.ACTIVE;
      needsSave = true;
    }

    if (!superAdmin.isUnlimitedAccess) {
      superAdmin.isUnlimitedAccess = true;
      needsSave = true;
    }

    if (superAdmin.roleType !== SUPER_ADMIN_CREDENTIALS.ROLE_TYPE) {
      superAdmin.roleType = SUPER_ADMIN_CREDENTIALS.ROLE_TYPE;
      needsSave = true;
    }

    if (superAdmin.name !== SUPER_ADMIN_CREDENTIALS.NAME) {
      superAdmin.name = SUPER_ADMIN_CREDENTIALS.NAME;
      needsSave = true;
    }

    if (needsSave) {
      await superAdmin.save();
      // console.log(`[SuperAdmin Service] Synced Super Admin account credentials (${email})`);
    }
  }

  return superAdmin;
}

/**
 * Checks if a given user is the Super Admin.
 */
export function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  const userEmail = (user.email || "").toLowerCase().trim();
  const superAdminEmail = SUPER_ADMIN_CREDENTIALS.EMAIL.toLowerCase().trim();
  return (
    userEmail === superAdminEmail ||
    user.roleType === SUPER_ADMIN_CREDENTIALS.ROLE_TYPE ||
    user.role === SUPER_ADMIN_CREDENTIALS.ROLE
  );
}

export interface AccessCheckResult {
  allowed: boolean;
  message?: string;
  statusCode?: number;
}

import Company from "@/models/Company";

/**
 * Validates whether a user is approved and has active (non-expired) access duration.
 * Also cascades Head Office status down to child branch accounts:
 * If the parent Head Office is suspended, deactivated, or expired, branch access is blocked.
 */
export async function validateUserLoginAccess(user: any): Promise<AccessCheckResult> {
  if (!user) {
    return { allowed: false, message: "User not found", statusCode: 404 };
  }

  // Super Admin always has full access
  if (isSuperAdminUser(user)) {
    return { allowed: true };
  }

  const rawStatus = String(user.status || "").trim().toLowerCase();

  // 0. Check if user account is deleted
  if (user.isDeleted || rawStatus === "deleted" || user.status === USER_APPROVAL_STATUS.DELETED) {
    return {
      allowed: false,
      message: "This account has been deleted by the Super Administrator. Access is permanently revoked.",
      statusCode: 403,
    };
  }

  // 1. Check if user is suspended, inactive, or deactivated
  if (
    rawStatus === "suspended" ||
    rawStatus === "inactive" ||
    rawStatus === "deactivated" ||
    rawStatus === "deactive" ||
    rawStatus === "disabled" ||
    user.status === USER_APPROVAL_STATUS.SUSPENDED
  ) {
    return {
      allowed: false,
      message: "Your account has been deactivated or suspended. Please contact administrator.",
      statusCode: 403,
    };
  }

  // 2. Check if user is approved
  if (!user.isApproved || rawStatus === "pendingapproval" || user.status === USER_APPROVAL_STATUS.PENDING) {
    return {
      allowed: false,
      message:
        "Your account is awaiting approval from the Super Admin. You cannot log in until approved. Please contact administrator at " +
        SUPER_ADMIN_CREDENTIALS.EMAIL,
      statusCode: 403,
    };
  }

  // 3. Check if user is rejected
  if (rawStatus === "rejected" || user.status === USER_APPROVAL_STATUS.REJECTED) {
    return {
      allowed: false,
      message:
        "Your account registration was rejected. Please contact administrator at " +
        SUPER_ADMIN_CREDENTIALS.EMAIL,
      statusCode: 403,
    };
  }

  // 4. Check time-bound validity of user
  if (!user.isUnlimitedAccess && user.accessValidUntil) {
    const expiryDate = new Date(user.accessValidUntil);
    const now = new Date();

    if (expiryDate.getTime() <= now.getTime()) {
      if (user.status !== USER_APPROVAL_STATUS.EXPIRED) {
        user.status = USER_APPROVAL_STATUS.EXPIRED;
        await user.save().catch((err: any) =>
          console.error("Failed to mark user as expired:", err)
        );
      }

      const formattedExpiry = expiryDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return {
        allowed: false,
        message: `Your account access expired on ${formattedExpiry}. Please contact Super Admin (${SUPER_ADMIN_CREDENTIALS.EMAIL}) to extend or renew your access.`,
        statusCode: 403,
      };
    }
  }

  // 5. Check Tenant Company & Parent Head Office Hierarchy
  if (user.companyId) {
    try {
      const userCompany: any = await Company.findById(user.companyId).lean();
      if (userCompany) {
        if (userCompany.isDeleted) {
          return {
            allowed: false,
            message: "Your company record has been deleted by the Super Administrator.",
            statusCode: 403,
          };
        }
        if (
          userCompany.status === "Suspended" ||
          userCompany.status === "Inactive" ||
          userCompany.status === "Deactivated"
        ) {
          return {
            allowed: false,
            message: "Your company branch has been deactivated or suspended by administrator.",
            statusCode: 403,
          };
        }
        if (userCompany.status === "Rejected") {
          return {
            allowed: false,
            message: "Your company registration was rejected.",
            statusCode: 403,
          };
        }

        // If this is a Child Branch, check the Parent Head Office status & validity
        if (userCompany.parentCompanyId) {
          const parentComp: any = await Company.findById(userCompany.parentCompanyId).lean();
          if (parentComp) {
            if (parentComp.isDeleted) {
              return {
                allowed: false,
                message: "Your organization's Head Office has been deleted. All branch operations are suspended.",
                statusCode: 403,
              };
            }
            if (
              parentComp.status === "Suspended" ||
              parentComp.status === "Inactive" ||
              parentComp.status === "Deactivated"
            ) {
              return {
                allowed: false,
                message: "Your organization's Head Office is suspended or deactivated. All branch access is disabled.",
                statusCode: 403,
              };
            }
            if (parentComp.status === "Rejected") {
              return {
                allowed: false,
                message: "Your organization's Head Office registration was rejected.",
                statusCode: 403,
              };
            }
          }

          // Check Head Office primary administrator's subscription & status
          const parentUser: any = await User.findOne({
            companyId: userCompany.parentCompanyId,
            isSuperAdmin: { $ne: true },
          }).lean();

          if (parentUser) {
            if (parentUser.isDeleted) {
              return {
                allowed: false,
                message: "Your organization's Head Office account has been deleted. Branch access is disabled.",
                statusCode: 403,
              };
            }
            if (!parentUser.isApproved || parentUser.status === USER_APPROVAL_STATUS.PENDING) {
              return {
                allowed: false,
                message: "Your organization's Head Office is awaiting Super Admin clearance. Branch access is disabled.",
                statusCode: 403,
              };
            }
            if (
              parentUser.status === USER_APPROVAL_STATUS.SUSPENDED ||
              parentUser.status === "Inactive" ||
              parentUser.status === "Deactivated"
            ) {
              return {
                allowed: false,
                message: "Your organization's Head Office is suspended. All branch access is disabled.",
                statusCode: 403,
              };
            }
            if (!parentUser.isUnlimitedAccess && parentUser.accessValidUntil) {
              const hoExpiry = new Date(parentUser.accessValidUntil);
              if (hoExpiry.getTime() <= Date.now()) {
                const formattedDate = hoExpiry.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                return {
                  allowed: false,
                  message: `Your organization's Head Office subscription access expired on ${formattedDate}. All branch access is disabled until renewal.`,
                  statusCode: 403,
                };
              }
            }
          }
        }
      }
    } catch (checkErr) {
      console.error("[SuperAdmin Service] Error verifying company hierarchy:", checkErr);
    }
  }

  return { allowed: true };
}
