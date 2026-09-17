// import { NextResponse } from "next/server";
// import connectDB from "@/lib/mongodb";
// import Customer from "@/models/Customer";
// import AccountGroup from "@/models/AccountGroup";

// export async function GET(
//   req: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     await connectDB();
//     const { id } = await params;

//     const customerDoc = await Customer.findById(id).lean();
//     if (!customerDoc) {
//       return NextResponse.json(null, { status: 404 });
//     }

//     const scode = String((customerDoc as any).SCODE || "").trim();
//     let groupInfo: any = {};
//     if (scode) {
//       const groupDoc = await AccountGroup.findOne(
//         { ORDNO: scode },
//         { PARNAM: 1, GROUP: 1, GCODE: 1 }
//       ).lean();

//       if (groupDoc) {
//         groupInfo = {
//           GROUPNAME: groupDoc.PARNAM || "",
//           MAINGROUP: groupDoc.GROUP || "",
//           PARENTGROUP: groupDoc.GCODE || "",
//         };
//       }
//     }

//     const enriched = {
//       ...customerDoc,
//       ...groupInfo,
//     };

//     return NextResponse.json(enriched);
//   } catch (error: any) {
//     return NextResponse.json(
//       { error: error.message || "Failed to fetch customer" },
//       { status: 500 }
//     );
//   }
// }
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import Order from "@/models/Order";
import SaleType from "@/models/SaleType";
import mongoose from "mongoose";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

function clean(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\u0000/g, "").trim();
}

function firstValue(...values: any[]): string {
  for (const value of values) {
    const v = clean(value);
    if (v) return v;
  }
  return "";
}

function resolveSaleTypeName(
  code: any,
  sgcode: string,
  saleTypeMap: Map<string, any>
): string {
  const value = clean(code);
  if (!value) return "";
  const key = `${sgcode.toUpperCase()}:${value.toUpperCase()}`;
  return firstValue(saleTypeMap.get(key)?.SNAME);
}

/* ---------------------------------------------------------- */
/* GET - Customer View                                        */
/* ---------------------------------------------------------- */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid customer id" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------------ */
    /* Hierarchy access control                                */
    /* ------------------------------------------------------ */
    const restriction = await getMrTerritoryRestriction();

    /*
     * Do the authorization check before returning ANY customer data.
     * For restricted users, an inaccessible customer is intentionally
     * returned as 404 instead of 403 so the API does not reveal that the
     * customer exists outside the user's hierarchy.
     */
    const customerDoc: any = await Customer.findById(id).lean();

    if (!customerDoc) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    if (restriction.isMrRestricted && !restriction.isPartyAllowed(customerDoc)) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    /* Account Group */
    const scode = clean(customerDoc.SCODE);
    let groupInfo: any = { GROUPCODE: scode };

    if (scode) {
      const groupDoc: any = await AccountGroup.findOne(
        { ORDNO: scode },
        { PARNAM: 1, GROUP: 1, GCODE: 1 }
      ).lean();

      if (groupDoc) {
        groupInfo = {
          GROUPCODE: scode,
          GROUPNAME: groupDoc.PARNAM || "",
          MAINGROUP: groupDoc.GROUP || "",
          PARENTGROUP: groupDoc.GCODE || "",
        };
      }
    }

    /* ------------------------------------------------------ */
    /* CUSTOMER -> ORDER_K19                                   */
    /* ------------------------------------------------------ */
    const customerOrdno = clean(customerDoc.ORDNO);
    const customerCodep = clean(customerDoc.CODEP);
    const orderKeys = Array.from(
      new Set([customerOrdno, customerCodep].filter(Boolean))
    );

    let order: any = null;

    if (orderKeys.length) {
      const orders: any[] = await Order.find(
        {
          $or: [
            { ORDNO: { $in: orderKeys } },
            { CODEP: { $in: orderKeys } },
          ],
        },
        {
          ORDNO: 1,
          CODEP: 1,
          STATE1: 1,
          STATE2: 1,
          ZONE: 1,
          CITY: 1,
          AREA: 1,
          STATION: 1,
          ROUT: 1,
          ROUTE: 1,
        }
      ).lean();

      const orderMap = new Map<string, any>();
      const fields = [
        "STATE1", "STATE2", "ZONE", "CITY", "AREA",
        "STATION", "ROUT", "ROUTE",
      ];

      for (const row of orders) {
        for (const key of [clean(row.ORDNO), clean(row.CODEP)].filter(Boolean)) {
          const existing = orderMap.get(key);
          if (!existing) {
            orderMap.set(key, { ...row });
            continue;
          }

          const merged = { ...existing };
          for (const field of fields) {
            if (!clean(merged[field]) && clean(row[field])) {
              merged[field] = row[field];
            }
          }
          orderMap.set(key, merged);
        }
      }

      order = orderMap.get(customerOrdno) || orderMap.get(customerCodep) || null;
    }

    /* ORDER codes */
    const orderState1 = clean(order?.STATE1);
    const orderState2 = clean(order?.STATE2);
    const orderZone = clean(order?.ZONE);
    const orderCity = clean(order?.CITY);
    const orderArea = clean(order?.AREA);
    const orderStation = clean(order?.STATION);
    const orderRoute = firstValue(order?.ROUTE, order?.ROUT);

    /* ------------------------------------------------------ */
    /* ORDER CODE -> SALETYPE SCODE -> SNAME                    */
    /* ------------------------------------------------------ */
    const territoryCodes = Array.from(
      new Set([
        orderState1,
        orderState2,
        orderZone,
        orderCity,
        orderArea,
        orderStation,
        orderRoute,
      ].map(v => clean(v).toUpperCase()).filter(Boolean))
    );

    const saleTypeQuery: any = {
      $or: [
        ...(territoryCodes.length ? [{ SCODE: { $in: territoryCodes } }] : []),
        { SGCODE: "STATE1" },
        { SGCODE: "STATE2" },
        { SGCODE: "ROUT" },
        { SGCODE: "ROUTE" },
      ],
    };

    const saleTypes: any[] = await SaleType.find(
      saleTypeQuery,
      { SCODE: 1, SGCODE: 1, SNAME: 1, TGCODE: 1 }
    ).lean();

    /* IMPORTANT: SGCODE + SCODE is the key. SCODE alone is unsafe. */
    const saleTypeMap = new Map<string, any>();
    for (const saleType of saleTypes) {
      const code = clean(saleType.SCODE).toUpperCase();
      const sgcode = clean(saleType.SGCODE).toUpperCase();
      if (code && sgcode) saleTypeMap.set(`${sgcode}:${code}`, saleType);
    }

    /* GST first two digits -> SALETYPE STATE1 TGCODE */
    const gstStateMap = new Map<string, string>();
    for (const saleType of saleTypes) {
      const sgcode = clean(saleType.SGCODE).toUpperCase();
      const tgcode = clean(saleType.TGCODE);
      if (sgcode !== "STATE1" || !tgcode) continue;

      const prefix = tgcode.substring(0, 2);
      const name = firstValue(saleType.SNAME);
      if (prefix && name && !gstStateMap.has(prefix)) {
        gstStateMap.set(prefix, name);
      }
    }

    const resolveStateFromGst = (gstNo: any): string => {
      const gst = clean(gstNo).toUpperCase();
      return gst.length >= 2 ? gstStateMap.get(gst.substring(0, 2)) || "" : "";
    };

    /* ------------------------------------------------------ */
    /* PRIORITY: saved Customer value -> GST -> ORDER/SALETYPE */
    /* ------------------------------------------------------ */
    const state1 =
      clean(customerDoc.state1) ||
      resolveStateFromGst(customerDoc.GSTNO) ||
      resolveSaleTypeName(orderState1, "STATE1", saleTypeMap) ||
      clean(customerDoc.STATE);

    const country =
      clean(customerDoc.country) ||
      resolveSaleTypeName(orderState2, "STATE2", saleTypeMap) ||
      "India";

    const zone =
      clean(customerDoc.ZONE) ||
      resolveSaleTypeName(orderZone, "ZONE", saleTypeMap);

    const city =
      clean(customerDoc.CITY) ||
      resolveSaleTypeName(orderCity, "CITY", saleTypeMap);

    const area =
      clean(customerDoc.Area) ||
      resolveSaleTypeName(orderArea, "AREA", saleTypeMap);

    const station =
      clean(customerDoc.station) ||
      resolveSaleTypeName(orderStation, "STATION", saleTypeMap);

    const route =
      clean(customerDoc.route) ||
      resolveSaleTypeName(orderRoute, "ROUTE", saleTypeMap) ||
      resolveSaleTypeName(orderRoute, "ROUT", saleTypeMap);

    const status =
      customerDoc.STATUS === "N" || customerDoc.SALDR === "N" ? "N" : "Y";

    return NextResponse.json({
      ...customerDoc,
      ...groupInfo,
      STATUS: status,
      state1,
      country,
      ZONE: zone,
      CITY: city,
      Area: area,
      station,
      route,

      /* Original ORDER_K19 source codes retained for software logic/debugging. */
      _orderTerritory: order
        ? {
            STATE1: orderState1,
            STATE2: orderState2,
            ZONE: orderZone,
            CITY: orderCity,
            AREA: orderArea,
            STATION: orderStation,
            ROUT: clean(order.ROUT),
            ROUTE: clean(order.ROUTE),
          }
        : null,
    });
  } catch (error: any) {
    console.error("GET /api/customers/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch customer details",
      },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------------------- */
/* PATCH - Save manual customer territory                      */
/* ---------------------------------------------------------- */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid customer id" },
        { status: 400 }
      );
    }

    /* ------------------------------------------------------ */
    /* Hierarchy access control                                */
    /* ------------------------------------------------------ */
    const restriction = await getMrTerritoryRestriction();
    const existingCustomer: any = await Customer.findById(id).lean();

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    if (restriction.isMrRestricted && !restriction.isPartyAllowed(existingCustomer)) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      "state1", "country", "ZONE", "CITY", "Area", "station", "route",
    ] as const;

    const updates: Record<string, string> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = clean(body[field]);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "country") && !updates.country) {
      updates.country = "India";
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { success: false, message: "No fields received to update" },
        { status: 400 }
      );
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true, strict: false }
    ).lean();

    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer ledger details saved successfully",
      data: updatedCustomer,
    });
  } catch (error: any) {
    console.error("PATCH /api/customers/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to save customer details",
      },
      { status: 500 }
    );
  }
}
