import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";

import AccountGroup from "@/models/AccountGroup";

import Order from "@/models/Order";

import SaleType from "@/models/SaleType";

import mongoose from "mongoose";

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

/* ============================================================
   HELPERS
============================================================ */

function clean(value: any): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\u0000/g, "")
    .trim();
}

function firstValue(...values: any[]): string {
  for (const value of values) {
    const cleaned = clean(value);

    if (cleaned) return cleaned;
  }

  return "";
}

function normalizeCode(value: any): string {
  return clean(value).toUpperCase();
}

/* ============================================================
   SALE TYPE MAP
============================================================ */

async function buildSaleTypeMap(codes: string[]) {
  const map = new Map<string, any>();

  if (!codes.length) return map;

  const uniqueCodes = Array.from(
    new Set(
      codes
        .map((code) => normalizeCode(code))
        .filter(Boolean)
    )
  );

  if (!uniqueCodes.length) return map;

  const saleTypes = await SaleType.find(
    {
      SCODE: {
        $in: uniqueCodes,
      },
    }
  )
    .select("SCODE SNAME STYPE")
    .lean();

  for (const row of saleTypes as any[]) {
    const code = normalizeCode(row?.SCODE);

    if (!code) continue;

    const type = normalizeCode(row?.STYPE);

    map.set(`${code}:${type}`, row);

    /*
      Some records may not have STYPE.
      Keep a fallback entry as well.
    */
    if (!type) {
      map.set(`${code}:`, row);
    }
  }

  return map;
}

function getSaleTypeName(
  saleTypeMap: Map<string, any>,
  code: any,
  type: any
): string {
  const normalizedCode = normalizeCode(code);
  const normalizedType = normalizeCode(type);

  if (!normalizedCode) return "";

  const exactKey = `${normalizedCode}:${normalizedType}`;

  const exact = saleTypeMap.get(exactKey);

  if (exact?.SNAME) {
    return firstValue(exact.SNAME);
  }

  const fallback = saleTypeMap.get(`${normalizedCode}:`);

  return firstValue(fallback?.SNAME);
}

/* ============================================================
   GET - CUSTOMER VIEW
============================================================ */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    /* --------------------------------------------------------
       Validate MongoDB ID
    -------------------------------------------------------- */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid customer id",
        },
        {
          status: 400,
        }
      );
    }

    /* --------------------------------------------------------
       Hierarchy access control
    -------------------------------------------------------- */

    const restriction = await getMrTerritoryRestriction();

    /*
     * Do the authorization check before returning ANY customer data.
     * For restricted users, an inaccessible customer is intentionally
     * returned as 404 instead of 403 so the API does not reveal that
     * the customer exists outside the user's hierarchy.
     */

    /* --------------------------------------------------------
       Customer
    -------------------------------------------------------- */

    const customer: any = await Customer.findById(id).lean();

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found",
        },
        {
          status: 404,
        }
      );
    }

    /* --------------------------------------------------------
       Territory restriction
    -------------------------------------------------------- */

    if (restriction?.enabled) {
      const allowed = restriction.allowed;

      const customerState = normalizeCode(customer?.STATE1);
      const customerZone = normalizeCode(customer?.ZONE);
      const customerArea = normalizeCode(customer?.AREA);
      const customerCity = normalizeCode(customer?.CITY);
      const customerStation = normalizeCode(customer?.STATION);
      const customerRoute = normalizeCode(
        firstValue(customer?.ROUTE, customer?.ROUT)
      );

      const hasRestrictionValue =
        allowed?.states?.length ||
        allowed?.zones?.length ||
        allowed?.areas?.length ||
        allowed?.cities?.length ||
        allowed?.stations?.length ||
        allowed?.routes?.length;

      if (hasRestrictionValue) {
        const allowedStates = new Set(
          (allowed?.states || []).map((x: any) =>
            normalizeCode(x)
          )
        );

        const allowedZones = new Set(
          (allowed?.zones || []).map((x: any) =>
            normalizeCode(x)
          )
        );

        const allowedAreas = new Set(
          (allowed?.areas || []).map((x: any) =>
            normalizeCode(x)
          )
        );

        const allowedCities = new Set(
          (allowed?.cities || []).map((x: any) =>
            normalizeCode(x)
          )
        );

        const allowedStations = new Set(
          (allowed?.stations || []).map((x: any) =>
            normalizeCode(x)
          )
        );

        const allowedRoutes = new Set(
          (allowed?.routes || []).map((x: any) =>
            normalizeCode(x)
          )
        );

        let territoryAllowed = false;

        if (
          customerState &&
          allowedStates.has(customerState)
        ) {
          territoryAllowed = true;
        }

        if (
          customerZone &&
          allowedZones.has(customerZone)
        ) {
          territoryAllowed = true;
        }

        if (
          customerArea &&
          allowedAreas.has(customerArea)
        ) {
          territoryAllowed = true;
        }

        if (
          customerCity &&
          allowedCities.has(customerCity)
        ) {
          territoryAllowed = true;
        }

        if (
          customerStation &&
          allowedStations.has(customerStation)
        ) {
          territoryAllowed = true;
        }

        if (
          customerRoute &&
          allowedRoutes.has(customerRoute)
        ) {
          territoryAllowed = true;
        }

        if (!territoryAllowed) {
          return NextResponse.json(
            {
              success: false,
              message: "Customer not found",
            },
            {
              status: 404,
            }
          );
        }
      }
    }

    /* --------------------------------------------------------
       ACCOUNT GROUP
    -------------------------------------------------------- */

    let accountGroup: any = null;

    const groupCode = firstValue(
      customer?.SCODE,
      customer?.GROUPCODE,
      customer?.ACGROUP
    );

    if (groupCode) {
      accountGroup = await AccountGroup.findOne({
        $or: [
          {
            code: groupCode,
          },
          {
            groupCode: groupCode,
          },
          {
            SCODE: groupCode,
          },
        ],
      }).lean();
    }

    /* --------------------------------------------------------
       CUSTOMER ORDER CODE
    -------------------------------------------------------- */

    const customerOrdno = clean(customer?.ORDNO);

    const customerCodep = clean(customer?.CODEP);

    /* --------------------------------------------------------
       ORDER LOOKUP
    -------------------------------------------------------- */

    let order: any = null;

    if (customerOrdno || customerCodep) {
      const orderCodes = Array.from(
        new Set(
          [
            customerOrdno,
            customerCodep,
          ].filter(Boolean)
        )
      );

      const orderRows = await Order.find({
        $or: [
          {
            ORDNO: {
              $in: orderCodes,
            },
          },
          {
            CODEP: {
              $in: orderCodes,
            },
          },
        ],
      })
        .lean();

      /*
       * Build map using both ORDNO and CODEP
       */

      const orderMap = new Map<string, any>();

      for (const row of orderRows as any[]) {
        const ordno = clean(row?.ORDNO);
        const codep = clean(row?.CODEP);

        if (ordno) {
          orderMap.set(ordno, row);
        }

        if (codep) {
          orderMap.set(codep, row);
        }
      }

      order =
        orderMap.get(customerOrdno) ||
        orderMap.get(customerCodep) ||
        null;
    }

    /* ========================================================
       MARG CUSTOMER EMAIL
       
       Exact MARG matching:

       ORDER_f18.ORDNO
              =
       vfp_new_folder_support.LCODE

       AND

       SNO = 2

       EMAIL =
       vfp_new_folder_support.REMARK
    ======================================================== */

    const supportCode =
      customerOrdno.toUpperCase();

    let customerEmail = "";

    if (supportCode) {
      /*
       * IMPORTANT:
       * Your MongoDB collection is:
       *
       * vfp_new_folder_support
       *
       * NOT SUPPORT_f18
       *
       * MongoDB Atlas screenshot confirms this.
       */

      const supportCollection =
        mongoose.connection.collection(
          "vfp_new_folder_support"
        );

      const supportRow: any =
        await supportCollection.findOne(
          {
            LCODE: supportCode,
            SNO: 2,
            _vfpDeleted: {
              $ne: true,
            },
          },
          {
            projection: {
              LCODE: 1,
              SNO: 1,
              REMARK: 1,
            },
          }
        );

      const remark =
        clean(supportRow?.REMARK);

      if (remark) {
        /*
         * Extract email from REMARK.
         *
         * Example:
         * MAIL@VKPUBLICATIONS.COM
         */

        const emailMatch =
          remark.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
          );

        customerEmail =
          emailMatch?.[0]
            ?.trim()
            .toUpperCase() || "";
      }

      console.log(
        "======================================"
      );

      console.log(
        "MARG CUSTOMER SUPPORT EMAIL"
      );

      console.log(
        "ORDER ORDNO:",
        customerOrdno
      );

      console.log(
        "SUPPORT LCODE:",
        supportRow?.LCODE || null
      );

      console.log(
        "SUPPORT SNO:",
        supportRow?.SNO ?? null
      );

      console.log(
        "SUPPORT REMARK:",
        supportRow?.REMARK || null
      );

      console.log(
        "FINAL CUSTOMER EMAIL:",
        customerEmail || "NOT_FOUND"
      );

      console.log(
        "======================================"
      );
    }

    /* --------------------------------------------------------
       ORDER TERRITORY VALUES
    -------------------------------------------------------- */

    const orderState1 =
      clean(order?.STATE1);

    const orderState2 =
      clean(order?.STATE2);

    const orderZone =
      clean(order?.ZONE);

    const orderCity =
      clean(order?.CITY);

    const orderArea =
      clean(order?.AREA);

    const orderStation =
      clean(order?.STATION);

    const orderRoute =
      firstValue(
        order?.ROUTE,
        order?.ROUT
      );

    /* --------------------------------------------------------
       ORDER CODE -> SALETYPE SCODE -> SNAME
    -------------------------------------------------------- */

    const territoryCodes =
      Array.from(
        new Set(
          [
            orderState1,
            orderState2,
            orderZone,
            orderCity,
            orderArea,
            orderStation,
            orderRoute,
          ]
            .map((v) =>
              clean(v).toUpperCase()
            )
            .filter(Boolean)
        )
      );

    const saleTypeQuery: any = {
      $or: [
        {
          SCODE: {
            $in: territoryCodes,
          },
        },
        {
          code: {
            $in: territoryCodes,
          },
        },
      ],
    };

    let saleTypeRows: any[] = [];

    if (territoryCodes.length) {
      saleTypeRows =
        (await SaleType.find(
          saleTypeQuery
        )
          .select(
            "SCODE SNAME STYPE code name type"
          )
          .lean()) as any[];
    }

    const saleTypeMap =
      new Map<string, any>();

    for (const row of saleTypeRows) {
      const code = normalizeCode(
        firstValue(
          row?.SCODE,
          row?.code
        )
      );

      const type = normalizeCode(
        firstValue(
          row?.STYPE,
          row?.type
        )
      );

      if (!code) continue;

      saleTypeMap.set(
        `${code}:${type}`,
        row
      );

      if (!type) {
        saleTypeMap.set(
          `${code}:`,
          row
        );
      }
    }

    const state1Name =
      getSaleTypeName(
        saleTypeMap,
        orderState1,
        "STATE1"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderState1,
        ""
      );

    const state2Name =
      getSaleTypeName(
        saleTypeMap,
        orderState2,
        "STATE2"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderState2,
        ""
      );

    const zoneName =
      getSaleTypeName(
        saleTypeMap,
        orderZone,
        "ZONE"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderZone,
        ""
      );

    const cityName =
      getSaleTypeName(
        saleTypeMap,
        orderCity,
        "CITY"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderCity,
        ""
      );

    const areaName =
      getSaleTypeName(
        saleTypeMap,
        orderArea,
        "AREA"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderArea,
        ""
      );

    const stationName =
      getSaleTypeName(
        saleTypeMap,
        orderStation,
        "STATION"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderStation,
        ""
      );

    const routeName =
      getSaleTypeName(
        saleTypeMap,
        orderRoute,
        "ROUTE"
      ) ||
      getSaleTypeName(
        saleTypeMap,
        orderRoute,
        ""
      );

    /* --------------------------------------------------------
       CUSTOMER STATUS
    -------------------------------------------------------- */

    const status =
      firstValue(
        customer?.STATUS,
        "Y"
      );

    /* --------------------------------------------------------
       FINAL RESPONSE
    -------------------------------------------------------- */

    const result: any = {
      ...customer,

      _id: String(
        customer?._id || ""
      ),

      PARNAM:
        customer?.PARNAM || "",

      ORDNO:
        customer?.ORDNO || "",

      CODEP:
        customer?.CODEP || "",

      SCODE:
        customer?.SCODE || "",

      PHONE1:
        customer?.PHONE1 || "",

      PHONE2:
        customer?.PHONE2 || "",

      CITY:
        customer?.CITY || "",

      GSTNO:
        customer?.GSTNO || "",

      DLNO:
        customer?.DLNO || "",

      REF:
        customer?.REF || "",

      GROUPNAME:
        customer?.GROUPNAME ||
        accountGroup?.groupName ||
        accountGroup?.name ||
        "",

      GROUPCODE:
        customer?.GROUPCODE ||
        customer?.SCODE ||
        groupCode ||
        "",

      BALANCE:
        customer?.BALANCE ?? 0,

      CREDIT:
        customer?.CREDIT ?? 0,

      STATUS:
        status,

      /*
       * ======================================================
       * IMPORTANT
       *
       * This is the email obtained from:
       *
       * ORDER_f18.ORDNO
       *        ->
       * vfp_new_folder_support.LCODE
       *        ->
       * SNO = 2
       *        ->
       * REMARK
       *
       * Example:
       * AEEG -> AEEG -> 2 -> MAIL@VKPUBLICATIONS.COM
       * ======================================================
       */

      EMAIL:
        customerEmail,

      /* ------------------------------------------------------
         Territory values
      ------------------------------------------------------ */

      state1:
        orderState1,

      state2:
        orderState2,

      zone:
        orderZone,

      city:
        orderCity,

      area:
        orderArea,

      station:
        orderStation,

      route:
        orderRoute,

      /* ------------------------------------------------------
         Territory names
      ------------------------------------------------------ */

      state1Name:
        state1Name,

      state2Name:
        state2Name,

      zoneName:
        zoneName,

      cityName:
        cityName,

      areaName:
        areaName,

      stationName:
        stationName,

      routeName:
        routeName,

      /* ------------------------------------------------------
         ORDER DATA
      ------------------------------------------------------ */

      orderTerritory: {
        STATE1:
          orderState1,

        STATE2:
          orderState2,

        ZONE:
          orderZone,

        CITY:
          orderCity,

        AREA:
          orderArea,

        STATION:
          orderStation,

        ROUTE:
          orderRoute,

        state1:
          state1Name,

        state2:
          state2Name,

        zone:
          zoneName,

        city:
          cityName,

        area:
          areaName,

        station:
          stationName,

        route:
          routeName,
      },

      accountGroup:
        accountGroup || null,
    };

    /* --------------------------------------------------------
       RETURN
    -------------------------------------------------------- */

    return NextResponse.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "GET /api/customers/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch customer",
      },
      {
        status: 500,
      }
    );
  }
}