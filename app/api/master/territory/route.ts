import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SaleType from "@/models/SaleType";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Territory masters are stored in the existing SALETYPE collection.
 *
 * ZONE    -> SGCODE = ZONE
 * AREA    -> SGCODE = AREA
 * STATION -> SGCODE = STATION
 * ROUTE   -> SGCODE = ROUT
 *
 * We intentionally do NOT create a new collection.
 */

type TerritoryType = "zone" | "area" | "station" | "route";

const MASTER_CONFIG: Record<
  TerritoryType,
  { sgcodes: string[]; prefix: string; label: string }
> = {
  zone: {
    sgcodes: ["ZONE"],
    prefix: "ZN",
    label: "Zone",
  },
  area: {
    sgcodes: ["AREA"],
    prefix: "AR",
    label: "Area",
  },
  station: {
    sgcodes: ["STATION"],
    prefix: "ST",
    label: "Station",
  },
  route: {
    // VFP SALETYPE uses ROUT in the supplied data. ROUTE is accepted
    // while reading so old/imported records are also shown.
    sgcodes: ["ROUT", "ROUTE"],
    prefix: "RT",
    label: "Route",
  },
};

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim();
}

function normalizeType(value: unknown): TerritoryType | null {
  const type = clean(value).toLowerCase();
  return (type in MASTER_CONFIG) ? (type as TerritoryType) : null;
}

function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

function generateCode(prefix: string): string {
  // Human-readable code; uniqueness is checked before insert.
  return `${prefix}${Date.now().toString(36).toUpperCase().slice(-7)}`;
}

function masterFilter(type: TerritoryType) {
  const config = MASTER_CONFIG[type];
  return { SGCODE: { $in: config.sgcodes } };
}

/* ---------------------------------------------------------- */
/* GET                                                        */
/* ---------------------------------------------------------- */

export async function GET() {
  try {
    await connectDB();

    const rows: any[] = await SaleType.find(
      {
        $or: [
          masterFilter("zone"),
          masterFilter("area"),
          masterFilter("station"),
          masterFilter("route"),
        ],
      },
      {
        _id: 1,
        SCODE: 1,
        SGCODE: 1,
        SNAME: 1,
        TGCODE: 1,
      }
    )
      .sort({ SGCODE: 1, SNAME: 1 })
      .lean();

    const result: Record<TerritoryType, any[]> = {
      zone: [],
      area: [],
      station: [],
      route: [],
    };

    rows.forEach((row) => {
      const sgcode = clean(row.SGCODE).toUpperCase();

      let type: TerritoryType | null = null;

      if (sgcode === "ZONE") type = "zone";
      else if (sgcode === "AREA") type = "area";
      else if (sgcode === "STATION") type = "station";
      else if (sgcode === "ROUT" || sgcode === "ROUTE") type = "route";

      if (!type) return;

      result[type].push({
        _id: String(row._id),
        SCODE: clean(row.SCODE),
        SGCODE: sgcode,
        SNAME: clean(row.SNAME),
        TGCODE: clean(row.TGCODE),
      });
    });

    return NextResponse.json(
      { success: true, data: result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Territory Master GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load territory masters",
      },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------- */
/* POST                                                       */
/* ---------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const type = normalizeType(body?.type);
    const name = clean(body?.SNAME || body?.name);

    if (!type) {
      return NextResponse.json(
        { success: false, message: "Invalid master type" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: `${MASTER_CONFIG[type].label} name is required` },
        { status: 400 }
      );
    }

    const config = MASTER_CONFIG[type];

    // Prevent duplicate names inside the same master.
    const duplicate = await SaleType.findOne({
      ...masterFilter(type),
      SNAME: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `${config.label} "${name}" already exists`,
        },
        { status: 409 }
      );
    }

    let SCODE = clean(body?.SCODE);

    if (!SCODE) {
      for (let i = 0; i < 10; i++) {
        const candidate = generateCode(config.prefix);
        const exists = await SaleType.findOne({ SCODE: candidate }).lean();
        if (!exists) {
          SCODE = candidate;
          break;
        }
      }
    }

    if (!SCODE) {
      return NextResponse.json(
        { success: false, message: "Could not generate unique master code" },
        { status: 500 }
      );
    }

    const existsCode = await SaleType.findOne({ SCODE }).lean();

    if (existsCode) {
      return NextResponse.json(
        {
          success: false,
          message: `Code "${SCODE}" already exists`,
        },
        { status: 409 }
      );
    }

    const created = await SaleType.create({
      SCODE,
      SGCODE: type === "route" ? "ROUT" : config.sgcodes[0],
      SNAME: name,
      TGCODE: clean(body?.TGCODE),
      _vfpTable: "SALETYPE_ADMIN",
      _vfpSourceKey: `ADMIN_${type.toUpperCase()}_${SCODE}_${Date.now()}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${config.label} created successfully`,
        data: {
          _id: String(created._id),
          SCODE: clean(created.SCODE),
          SGCODE: clean(created.SGCODE),
          SNAME: clean(created.SNAME),
          TGCODE: clean(created.TGCODE),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Territory Master POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create master",
      },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------- */
/* PUT                                                        */
/* ---------------------------------------------------------- */

export async function PUT(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const type = normalizeType(body?.type);
    const id = clean(body?._id);
    const name = clean(body?.SNAME || body?.name);

    if (!type || !id || !isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Valid master type and id are required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: `${MASTER_CONFIG[type].label} name is required` },
        { status: 400 }
      );
    }

    const current = await SaleType.findById(id).lean();

    if (!current) {
      return NextResponse.json(
        { success: false, message: "Master record not found" },
        { status: 404 }
      );
    }

    const duplicate = await SaleType.findOne({
      ...masterFilter(type),
      _id: { $ne: id },
      SNAME: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: `${MASTER_CONFIG[type].label} "${name}" already exists`,
        },
        { status: 409 }
      );
    }

    const updated = await SaleType.findByIdAndUpdate(
      id,
      {
        $set: {
          SNAME: name,
          SGCODE: type === "route" ? "ROUT" : MASTER_CONFIG[type].sgcodes[0],
        },
      },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      message: `${MASTER_CONFIG[type].label} updated successfully`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Territory Master PUT error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update master",
      },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------- */
/* DELETE                                                     */
/* ---------------------------------------------------------- */

export async function DELETE(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = normalizeType(searchParams.get("type"));
    const id = clean(searchParams.get("id"));

    if (!type || !id || !isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Valid master type and id are required" },
        { status: 400 }
      );
    }

    const record = await SaleType.findOne({
      _id: id,
      ...masterFilter(type),
    }).lean();

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Master record not found" },
        { status: 404 }
      );
    }

    await SaleType.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: `${MASTER_CONFIG[type].label} deleted successfully`,
    });
  } catch (error: any) {
    console.error("Territory Master DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete master",
      },
      { status: 500 }
    );
  }
}
