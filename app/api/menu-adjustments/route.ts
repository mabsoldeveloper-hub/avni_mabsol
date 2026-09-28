import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MenuAdjustment from "@/models/MenuAdjustment";
import { getCurrentUser } from "@/lib/auth";
import { getDefaultMenuItems } from "@/lib/defaultMenuData";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    let companyId = searchParams.get("companyId");
    let financialYearId = searchParams.get("financialYearId") || "ALL";

    // If companyId is not provided, attempt to get from current user session
    if (!companyId || companyId === "undefined" || companyId === "null") {
      const user = await getCurrentUser();
      if (user && user.companyId) {
        companyId = typeof user.companyId === "object" ? user.companyId._id?.toString() : user.companyId.toString();
      }
    }

    if (!companyId) {
      return NextResponse.json({
        success: true,
        isCustomized: false,
        items: getDefaultMenuItems(),
        companyId: null,
        financialYearId: "ALL",
      });
    }

    // First check exact match for companyId + financialYearId
    let config = await MenuAdjustment.findOne({
      companyId,
      financialYearId: financialYearId || "ALL",
    }).lean();

    // If not found and a specific financialYearId was provided, fallback to "ALL" for this company
    if (!config && financialYearId !== "ALL") {
      config = await MenuAdjustment.findOne({
        companyId,
        financialYearId: "ALL",
      }).lean();
    }

    if (!config || !config.items || config.items.length === 0) {
      return NextResponse.json({
        success: true,
        isCustomized: false,
        items: getDefaultMenuItems(),
        companyId,
        financialYearId,
      });
    }

    const defaults = getDefaultMenuItems();
    const existingIds = new Set(config.items.map((i: any) => i.id));
    const mergedItems = [...config.items];

    defaults.forEach((defItem) => {
      if (!existingIds.has(defItem.id)) {
        mergedItems.push(defItem);
      } else {
        const found = mergedItems.find((i: any) => i.id === defItem.id);
        if (found && defItem.subItems && defItem.subItems.length > 0) {
          if (!found.subItems) found.subItems = [];
          // Prune obsolete migration ERP sub-items that have been consolidated into Data Sync
          if (found.id === "migration") {
            const obsoleteMigrationIds = new Set([
              "migration-busy",
              "migration-tally",
              "migration-easysol",
              "migration-logic",
              "migration-marg",
            ]);
            found.subItems = found.subItems.filter(
              (s: any) => !obsoleteMigrationIds.has(s.id)
            );
          }
          const existingSubIds = new Set(found.subItems.map((s: any) => s.id));
          defItem.subItems.forEach((defSub) => {
            if (!existingSubIds.has(defSub.id)) {
              found.subItems.push(defSub);
            }
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      isCustomized: true,
      items: mergedItems,
      companyId,
      financialYearId: config.financialYearId || financialYearId,
    });
  } catch (error: any) {
    console.error("Error fetching menu adjustments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch menu adjustments",
        items: getDefaultMenuItems(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const body = await req.json();

    const { companyId, financialYearId = "ALL", items } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId is required to save menu adjustments" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "items array is required" },
        { status: 400 }
      );
    }

    const updatedConfig = await MenuAdjustment.findOneAndUpdate(
      {
        companyId,
        financialYearId: financialYearId || "ALL",
      },
      {
        tenantId: user?.tenantId || "TENANT001",
        companyId,
        financialYearId: financialYearId || "ALL",
        isCustomized: true,
        items,
        updatedBy: user?._id || undefined,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Menu adjustments saved successfully",
      data: updatedConfig,
    });
  } catch (error: any) {
    console.error("Error saving menu adjustments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save menu adjustments" },
      { status: 500 }
    );
  }
}
