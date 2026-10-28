import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";

import InventoryAlertSetting from "@/models/InventoryAlertSetting";

import {
  getInventorySettings,
  sendInventoryAlertEmail,
} from "@/lib/inventoryIntelligence";
import { ensureWatchdogRunning } from "@/lib/services/customerAlertScheduler";

export const dynamic = "force-dynamic";

/* =========================================================
   ROLE HELPERS
   ========================================================= */

function roleOf(user: any): string {
  const roleName = String(
    user?.roleId?.roleName ||
      user?.roleName ||
      user?.role ||
      user?.roleType ||
      ""
  )
    .trim()
    .toLowerCase();

  return roleName;
}

function dashboardTypeOf(user: any): string {
  return String(
    user?.roleId?.dashboardType ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isAdmin(user: any): boolean {
  if (!user) {
    return false;
  }

  /* Super Admin flag */
  if (user?.isSuperAdmin === true) {
    return true;
  }

  const role = roleOf(user);
  const dashboardType = dashboardTypeOf(user);

  /* Role name based check */
  if (
    role === "admin" ||
    role === "administrator" ||
    role === "superadmin" ||
    role === "super admin" ||
    role.includes("admin") ||
    role.includes("super")
  ) {
    return true;
  }

  /* Role dashboard type */
  if (dashboardType === "admin") {
    return true;
  }

  return false;
}

/* =========================================================
   COMPANY HELPER
   ========================================================= */

function companyOf(user: any): string {
  if (!user?.companyId) {
    return "";
  }

  if (typeof user.companyId === "object") {
    return String(
      user.companyId?._id || ""
    );
  }

  return String(user.companyId);
}

/* =========================================================
   TENANT HELPER
   ========================================================= */

function tenantOf(user: any): string {
  return String(
    user?.tenantId || "TENANT001"
  );
}

/* =========================================================
   GET SETTINGS
   ========================================================= */

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const searchParams =
      new URL(req.url).searchParams;

    const companyId =
      searchParams.get("companyId") ||
      companyOf(user);

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Company is required",
        },
        {
          status: 400,
        }
      );
    }

    const tenantId = tenantOf(user);
    const adminEmail = String(user?.email || "").trim().toLowerCase();

    const settings =
      await getInventorySettings(
        tenantId,
        companyId,
        adminEmail
      );

    return NextResponse.json({
      success: true,
      settings,
      adminEmail,
    });
  } catch (error: any) {
    console.error(
      "Inventory Intelligence GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to load inventory settings",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       ADMIN SECURITY CHECK
       ===================================================== */

    if (!isAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();

    /* =====================================================
       COMPANY
       ===================================================== */

    const companyId = String(
      body?.companyId ||
        companyOf(user)
    ).trim();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Company is required",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       TENANT
       ===================================================== */

    const tenantId = tenantOf(user);

    /* =====================================================
       TEST EMAIL
       ===================================================== */

    if (body?.action === "TEST_EMAIL") {
      const settings =
        await getInventorySettings(
          tenantId,
          companyId
        );

      const testRecipient = String(
        body?.testRecipient || ""
      )
        .trim()
        .toLowerCase();

      if (
        !testRecipient ||
        !testRecipient.includes("@")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Valid test recipient is required",
          },
          {
            status: 400,
          }
        );
      }

      const testSettings = {
        ...settings,
        recipients: [testRecipient],
      };

      const result =
        await sendInventoryAlertEmail(
          testSettings,
          true
        );

      return NextResponse.json(result);
    }

    /* =====================================================
       NORMAL SETTINGS SAVE
       ===================================================== */

    const data: any = {
      ...body,
    };

    /* Remove protected/request-only fields */

    delete data.action;
    delete data.testRecipient;
    delete data.companyId;
    delete data.tenantId;
    delete data._id;
    delete data.__v;

    /* =====================================================
       RECIPIENTS
       ===================================================== */

    data.recipients = Array.isArray(
      data.recipients
    )
      ? [
          ...new Set(
            data.recipients
              .map((email: any) =>
                String(email)
                  .trim()
                  .toLowerCase()
              )
              .filter(
                (email: string) =>
                  email.includes("@")
              )
          ),
        ]
      : [];

    const adminEmail = String(user?.email || "").trim().toLowerCase();
    if (data.recipients.length === 0 && adminEmail) {
      data.recipients = [adminEmail];
    }

    /* =====================================================
       NEAR EXPIRY
       ===================================================== */

    data.nearExpiry = {
      ...data.nearExpiry,

      windowDays: Math.max(
        1,
        Math.min(
          3650,
          Number(
            data.nearExpiry?.windowDays ||
              90
          )
        )
      ),

      minStock: Math.max(
        1,
        Number(
          data.nearExpiry?.minStock ||
            1
        )
      ),
    };

    /* =====================================================
       DEAD / DUMP STOCK
       ===================================================== */

    data.deadStock = {
      ...data.deadStock,

      noMovementDays: Math.max(
        1,
        Math.min(
          3650,
          Number(
            data.deadStock
              ?.noMovementDays || 180
          )
        )
      ),

      minStock: Math.max(
        1,
        Number(
          data.deadStock?.minStock ||
            1
        )
      ),
    };

    /* =====================================================
       FAST / SLOW MOVEMENT
       ===================================================== */

    data.movement = {
      ...data.movement,

      analysisDays: Math.max(
        1,
        Math.min(
          365,
          Number(
            data.movement?.analysisDays ||
              30
          )
        )
      ),

      fastStockCoverDays: Math.max(
        1,
        Number(
          data.movement
            ?.fastStockCoverDays || 15
        )
      ),

      slowStockCoverDays: Math.max(
        1,
        Number(
          data.movement
            ?.slowStockCoverDays || 60
        )
      ),

      minSalesQty: Math.max(
        0,
        Number(
          data.movement?.minSalesQty ||
            1
        )
      ),
    };

    /* =====================================================
       EMAIL SETTINGS
       ===================================================== */

    data.email = {
      ...data.email,

      sendHour: Math.max(
        0,
        Math.min(
          23,
          Number(
            data.email?.sendHour || 0
          )
        )
      ),

      sendMinute: Math.max(
        0,
        Math.min(
          59,
          Number(
            data.email?.sendMinute || 0
          )
        )
      ),

      weeklyDay: Math.max(
        0,
        Math.min(
          6,
          Number(
            data.email?.weeklyDay || 1
          )
        )
      ),

      monthlyDay: Math.max(
        1,
        Math.min(
          28,
          Number(
            data.email?.monthlyDay || 1
          )
        )
      ),
    };

    /* =====================================================
       DATABASE
       ===================================================== */

    await dbConnect();

    const settings =
      await InventoryAlertSetting.findOneAndUpdate(
        {
          tenantId,
          companyId,
        },
        {
          $set: {
            ...data,
            tenantId,
            companyId,
            updatedBy: String(
              user._id
            ),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

    // Ensure persistent watchdog is actively checking schedules
    ensureWatchdogRunning();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error(
      "Inventory Intelligence POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to save inventory settings",
      },
      {
        status: 500,
      }
    );
  }
}