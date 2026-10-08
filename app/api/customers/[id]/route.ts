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
   GET CUSTOMER
============================================================ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    /* --------------------------------------------------------
       Validate ID
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
       Territory / hierarchy restriction
    -------------------------------------------------------- */

    const restriction =
      await getMrTerritoryRestriction();

    /* --------------------------------------------------------
       CUSTOMER
    -------------------------------------------------------- */

    const customer: any =
      await Customer.findById(id).lean();

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

       IMPORTANT:
       getMrTerritoryRestriction() returns:

       isMrRestricted
       isPartyAllowed()

       It does NOT return:

       restriction.enabled
       restriction.allowed
    -------------------------------------------------------- */

    if (restriction?.isMrRestricted) {
      const partyAllowed =
        restriction.isPartyAllowed(customer);

      if (!partyAllowed) {
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
      accountGroup =
        await AccountGroup.findOne({
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

    const customerOrdno =
      clean(customer?.ORDNO);

    const customerCodep =
      clean(customer?.CODEP);

    /* --------------------------------------------------------
       ORDER LOOKUP
    -------------------------------------------------------- */

    let order: any = null;

    if (customerOrdno || customerCodep) {
      const orderCodes =
        Array.from(
          new Set(
            [
              customerOrdno,
              customerCodep,
            ].filter(Boolean)
          )
        );

      const orderRows =
        await Order.find({
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
        }).lean();

      const orderMap =
        new Map<string, any>();

      for (const row of orderRows as any[]) {
        const ordno =
          clean(row?.ORDNO);

        const codep =
          clean(row?.CODEP);

        if (ordno) {
          orderMap.set(
            ordno,
            row
          );
        }

        if (codep) {
          orderMap.set(
            codep,
            row
          );
        }
      }

      order =
        orderMap.get(
          customerOrdno
        ) ||
        orderMap.get(
          customerCodep
        ) ||
        null;
    }

    /* ========================================================
       MARG CUSTOMER EMAIL

       EXACT MATCHING:

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
       *
       * Actual MongoDB collection:
       *
       * vfp_new_folder_support
       *
       * Example:
       *
       * LCODE  = AEEG
       * SNO    = 2
       * REMARK = MAIL@VKPUBLICATIONS.COM
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
        clean(
          supportRow?.REMARK
        );

      if (remark) {
        /*
         * Extract email from REMARK.
         *
         * Example:
         *
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

      /* ------------------------------------------------------
         DEBUG
      ------------------------------------------------------ */

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
        customerEmail ||
          "NOT_FOUND"
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
       SALE TYPE LOOKUP
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
            .map((value) =>
              clean(value).toUpperCase()
            )
            .filter(Boolean)
        )
      );

    let saleTypeRows: any[] = [];

    if (territoryCodes.length) {
      saleTypeRows =
        (await SaleType.find({
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
        })
          .select(
            "SCODE SNAME STYPE code name type"
          )
          .lean()) as any[];
    }

    const saleTypeMap =
      new Map<string, any>();

    for (const row of saleTypeRows) {
      const code =
        normalizeCode(
          firstValue(
            row?.SCODE,
            row?.code
          )
        );

      const type =
        normalizeCode(
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

    const getSaleTypeName = (
      code: any,
      type: any
    ): string => {
      const normalizedCode =
        normalizeCode(code);

      const normalizedType =
        normalizeCode(type);

      if (!normalizedCode) {
        return "";
      }

      const exact =
        saleTypeMap.get(
          `${normalizedCode}:${normalizedType}`
        );

      if (exact?.SNAME) {
        return firstValue(
          exact.SNAME
        );
      }

      const fallback =
        saleTypeMap.get(
          `${normalizedCode}:`
        );

      return firstValue(
        fallback?.SNAME
      );
    };

    const state1Name =
      getSaleTypeName(
        orderState1,
        "STATE1"
      ) ||
      getSaleTypeName(
        orderState1,
        ""
      );

    const state2Name =
      getSaleTypeName(
        orderState2,
        "STATE2"
      ) ||
      getSaleTypeName(
        orderState2,
        ""
      );

    const zoneName =
      getSaleTypeName(
        orderZone,
        "ZONE"
      ) ||
      getSaleTypeName(
        orderZone,
        ""
      );

    const cityName =
      getSaleTypeName(
        orderCity,
        "CITY"
      ) ||
      getSaleTypeName(
        orderCity,
        ""
      );

    const areaName =
      getSaleTypeName(
        orderArea,
        "AREA"
      ) ||
      getSaleTypeName(
        orderArea,
        ""
      );

    const stationName =
      getSaleTypeName(
        orderStation,
        "STATION"
      ) ||
      getSaleTypeName(
        orderStation,
        ""
      );

    const routeName =
      getSaleTypeName(
        orderRoute,
        "ROUTE"
      ) ||
      getSaleTypeName(
        orderRoute,
        ""
      );

    /* --------------------------------------------------------
       FINAL CUSTOMER RESPONSE
    -------------------------------------------------------- */

    const result: any = {
      ...customer,

      _id:
        String(
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
        customer?.STATUS || "Y",

      /* ======================================================
         IMPORTANT MARG EMAIL

         AEEG
          ↓
         SUPPORT LCODE AEEG
          ↓
         SNO 2
          ↓
         REMARK
          ↓
         MAIL@VKPUBLICATIONS.COM
      ====================================================== */

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
         Order territory
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

      /* ------------------------------------------------------
         Account Group
      ------------------------------------------------------ */

      accountGroup:
        accountGroup || null,
    };

    /* --------------------------------------------------------
       RESPONSE
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