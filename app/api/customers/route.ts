import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import Order from "@/models/Order";
import SaleType from "@/models/SaleType";

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import {
  getCompanyVfpFilter,
  combineFilters,
} from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

/* ---------------------------------------------------------- */
/* Helpers                                                     */
/* ---------------------------------------------------------- */

function clean(value: any): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/\u0000/g, "")
    .trim();
}

/**
 * Returns first non-empty value from provided values.
 */
function firstValue(...values: any[]): string {
  for (const value of values) {
    const v = clean(value);

    if (v) {
      return v;
    }
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
  const saleType = saleTypeMap.get(key);

  if (!saleType) {
    return "";
  }

  return firstValue(saleType.SNAME);
}

/* ---------------------------------------------------------- */
/* GET                                                          */
/* ---------------------------------------------------------- */

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    /* ------------------------------------------------------ */
    /* Company filter                                           */
    /* ------------------------------------------------------ */

    const companyVfpMatch = await getCompanyVfpFilter(searchParams);

    /* ------------------------------------------------------ */
    /* MR territory restriction                                 */
    /* ------------------------------------------------------ */

    const restriction = await getMrTerritoryRestriction();

    /* ------------------------------------------------------ */
    /* Account Groups                                           */
    /* ------------------------------------------------------ */

    const groups = await AccountGroup.find(
      {},
      {
        ORDNO: 1,
        PARNAM: 1,
        GROUP: 1,
        GCODE: 1,
      }
    ).lean();

    const groupMap = new Map<string, any>();

    groups.forEach((g: any) => {
      const ordno = clean(g.ORDNO);

      if (ordno) {
        groupMap.set(ordno, g);
      }
    });

    /* ------------------------------------------------------ */
    /* Customers                                                */
    /* ------------------------------------------------------ */

    /*
     * IMPORTANT:
     * Customer is backed by vfp_new_folder_order. The hierarchy must be
     * applied in MongoDB, not after loading the complete customer master.
     *
     * This keeps the API fast and, more importantly, prevents a restricted
     * user from receiving another user's parties in the API response.
     */
    let hierarchyCustomerFilter: Record<string, any> = {};

    if (restriction.isMrRestricted) {
      const allowedOrdnos = (restriction.allowedOrdnos || [])
        .map((v: any) => clean(v))
        .filter(Boolean);

      const allowedCompanyCodes = (restriction.allowedCompanyCodes || [])
        .map((v: any) => clean(v))
       
        .filter(Boolean);

      const escapeRegex = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const exactRegexes = (values: string[]) =>
        values.map((value) =>
          new RegExp(`^${escapeRegex(value)}\\s*$`, "i")
        );

      const ordnoRegexes = exactRegexes(allowedOrdnos);
      const companyRegexes = exactRegexes(allowedCompanyCodes);

      const accessOr: any[] = [];

      if (ordnoRegexes.length) {
        accessOr.push(
          { ORDNO: { $in: ordnoRegexes } },
          { CODEP: { $in: ordnoRegexes } },
          { CODE: { $in: ordnoRegexes } }
        );
      }

      if (companyRegexes.length) {
        accessOr.push(
          { COMPANY: { $in: companyRegexes } },
          { GCODE: { $in: companyRegexes } },
          { SCODE: { $in: companyRegexes } }
        );
      }

      /*
       * Legacy Marg/VFP customer rows can carry the responsible hierarchy
       * member directly. Keep these fields as a compatibility path.
       */
      /*
       * allowedOrdnos already contains the legacy Customer.ORDNO values
       * resolved by getMrTerritoryRestriction(). We therefore do not add a
       * broad manager-name OR here; doing so can accidentally grant unrelated
       * parties when old VFP data contains reused names.
       */

      hierarchyCustomerFilter =
        accessOr.length > 0
          ? { $or: accessOr }
          : { _id: null };
    }

    const allCustomers: any[] = await Customer.find(
      combineFilters(companyVfpMatch, hierarchyCustomerFilter),
      {
        PARNAM: 1,
        ORDNO: 1,
        SCODE:1,
        CODEP: 1,

        CITY: 1,

        PHONE1: 1,
        GSTNO: 1,
        DLNO: 1,

        BALANCE: 1,
        CREDIT: 1,

        STATUS: 1,
        COMPANY: 1,

        GCODE: 1,
        DSM: 1,
        RSM: 1,
        ASM: 1,
        MR: 1,
        HQT: 1,
        ROUT: 1,

        GSTHED: 1,
        STATE: 1,

        state1: 1,
        country: 1,
        ZONE: 1,
        Area: 1,
        station: 1,
        route: 1,

        PRICE: 1,
        SALDR: 1,
      }
    )
      .sort({ PARNAM: 1 })
      .lean();

    /* ------------------------------------------------------ */
    /* Account-group filter                                     */
    /* ------------------------------------------------------ */

    /*
     * Access control was already applied in the MongoDB query above.
     * Only keep the existing Marg-compatible SUNDRY group rule here.
     */
    const customers = allCustomers.filter((c: any) => {
      const scode = clean(c.SCODE).toUpperCase();
      /*
       * Customer Master should show these Account Group codes:
       * C6, C6², D3, D31, D31², D32, D33, D34
       *
       * In ACGROUP, GROUP and ORDNO are different fields.
       * Example:
       * GROUP = C6
       * ORDNO = C6²
       *
       * Customer.SCODE points to the account-group/order code used
       * by the existing Customer Master data.
       */
      const allowedGroupCodes = new Set([
        "C",
        "C6",
        "C6z", 
        "D3",
        "D31",
        "D31z",
        "D33",
        "D34",
      ]);

      return allowedGroupCodes.has(scode);
    });


    const customerOrderNumbers = Array.from(
      new Set(
        customers
          .flatMap((c: any) => [
            clean(c.ORDNO),
            clean(c.CODEP),
          ])
          .filter(Boolean)
      )
    );

    const orders: any[] = customerOrderNumbers.length
      ? await Order.find(
          {
            $or: [
              {
                ORDNO: {
                  $in: customerOrderNumbers,
                },
              },
              {
                CODEP: {
                  $in: customerOrderNumbers,
                },
              },
            ],
          },
          {
            ORDNO: 1,
            CODEP: 1,
            SCODE: 1,

            STATE1: 1,
            STATE2: 1,

            ZONE: 1,
            CITY: 1,
            AREA: 1,
            STATION: 1,
            ROUT: 1,
            ROUTE: 1,

            DSM: 1,
            RSM: 1,
            ASM: 1,
            HQT: 1,
          }
        ).lean()
      : [];

    /* ------------------------------------------------------ */
    /* Create ORDER map                                         */
    /* ------------------------------------------------------ */

    const orderMap = new Map<string, any>();

    orders.forEach((order: any) => {
      const keys = [
        clean(order.ORDNO),
        clean(order.CODEP),
      ].filter(Boolean);

      keys.forEach((key) => {
        const existing = orderMap.get(key);

        if (!existing) {
          orderMap.set(key, order);
          return;
        }

        /**
         * If multiple ORDER records exist for same party,
         * merge non-empty territory values.
         */

        const merged = {
          ...existing,
        };

        const fields = [
          "STATE1",
          "STATE2",
          "ZONE",
          "CITY",
          "AREA",
          "STATION",
          "ROUT",
          "ROUTE",
          "DSM",
          "RSM",
          "ASM",
          "HQT",
        ];

        fields.forEach((field) => {
          if (!clean(merged[field]) && clean(order[field])) {
            merged[field] = order[field];
          }
        });

        orderMap.set(key, merged);
      });
    });

    /* ------------------------------------------------------ */
    /* Load SALETYPE                                            */
    /* ------------------------------------------------------ */

    /**
     * We first collect all possible territory codes from ORDER.
     */

    const territoryCodes = new Set<string>();

    orders.forEach((order: any) => {
      const fields = [
        "STATE1",
        "STATE2",
        "ZONE",
        "CITY",
        "AREA",
        "STATION",
        "ROUT",
        "ROUTE",
        "DSM",
        "RSM",
        "ASM",
        "HQT",
      ];

      fields.forEach((field) => {
        const value = clean(order[field]);

        if (value) {
          territoryCodes.add(value.toUpperCase());
        }
      });
    });

 
    /*
     * Load all ORDER territory codes plus STATE1/ROUT/ROUTE SaleType rows.
     *
     * GSTNO first two digits are matched against the first two
     * characters of SALETYPE.TGCODE for SGCODE = STATE1.
     */
    const saleTypeQuery: any = {
      $or: [
        {
          SCODE: {
            $in: Array.from(territoryCodes),
          },
        },
        {
          SGCODE: "STATE1",
        },
        {
          SGCODE: "ROUT",
        },
        {
          SGCODE: "ROUTE",
        },
      ],
    };

    const saleTypes: any[] = await SaleType.find(
      saleTypeQuery,
      {
        SCODE: 1,
        SGCODE: 1,
        SNAME: 1,
        TGCODE: 1,
      }
    ).lean();

    const saleTypeMap = new Map<string, any>();

    saleTypes.forEach((saleType: any) => {
      const code = clean(saleType.SCODE).toUpperCase();
      const sgcode = clean(saleType.SGCODE).toUpperCase();

      if (code && sgcode) {
        const key = `${sgcode}:${code}`;
        saleTypeMap.set(key, saleType);
      }
    });

  
    const gstStateMap = new Map<string, string>();

    saleTypes.forEach((saleType: any) => {
      const sgcode = clean(saleType.SGCODE).toUpperCase();
      const tgcode = clean(saleType.TGCODE);

      if (sgcode !== "STATE1" || !tgcode) return;

      const prefix = tgcode.substring(0, 2);

      if (prefix && !gstStateMap.has(prefix)) {
        const name = firstValue(saleType.SNAME);
        if (name) {
          gstStateMap.set(prefix, name);
        }
      }
    });

    function resolveStateFromGst(gstNo: any): string {
      const gst = clean(gstNo).toUpperCase();

      if (gst.length < 2) return "";

      const prefix = gst.substring(0, 2);

      return gstStateMap.get(prefix) || "";
    }

    /* ------------------------------------------------------ */
    /* Build final response                                     */
    /* ------------------------------------------------------ */

    const result = customers.map((c: any) => {
      const scode = clean(c.SCODE);

      const grp = groupMap.get(scode);

      /* ---------------------------------------------------- */
      /* Find ORDER                                            */
      /* ---------------------------------------------------- */

      const customerOrdno = clean(c.ORDNO);
      const customerCodep = clean(c.CODEP);

      const order =
        orderMap.get(customerOrdno) ||
        orderMap.get(customerCodep) ||
        null;

      /* ---------------------------------------------------- */
      /* Territory values                                      */
      /* ---------------------------------------------------- */

      const orderState1 = clean(order?.STATE1);
      const orderState2 = clean(order?.STATE2);

      const orderZone = clean(order?.ZONE);

      const orderCity = clean(order?.CITY);

      const orderArea = clean(order?.AREA);

      const orderStation = clean(order?.STATION);

      const orderRoute = firstValue(
        order?.ROUTE,
        order?.ROUT
      );

      /* ---------------------------------------------------- */
      /* Resolve through SALETYPE                              */
      /* ---------------------------------------------------- */

      const state1 =
        clean(c.state1) ||
        resolveStateFromGst(c.GSTNO) ||
        resolveSaleTypeName(
          orderState1,
          "STATE1",
          saleTypeMap
        ) ||
        clean(c.STATE);

      const country =
        clean(c.country) ||
        resolveSaleTypeName(
          orderState2,
          "STATE2",
          saleTypeMap
        ) ||
        "India";

      const zone =
        clean(c.ZONE) ||
        resolveSaleTypeName(
          orderZone,
          "ZONE",
          saleTypeMap
        );

      const city =
        clean(c.CITY) ||
        resolveSaleTypeName(
          orderCity,
          "CITY",
          saleTypeMap
        );

      const area =
        clean(c.Area) ||
        resolveSaleTypeName(
          orderArea,
          "AREA",
          saleTypeMap
        );

      const station =
        clean(c.station) ||
        resolveSaleTypeName(
          orderStation,
          "STATION",
          saleTypeMap
        );

      const route =
        clean(c.route) ||
        resolveSaleTypeName(
          orderRoute,
          "ROUTE",
          saleTypeMap
        ) ||
        resolveSaleTypeName(
          orderRoute,
          "ROUT",
          saleTypeMap
        );

      /* ---------------------------------------------------- */
      /* Active / inactive                                     */
      /* ---------------------------------------------------- */

      const isActive =
        c.STATUS === "N" || c.SALDR === "N"
          ? "N"
          : "Y";

      /* ---------------------------------------------------- */
      /* Final customer                                        */
      /* ---------------------------------------------------- */

      return {
        ...c,

        STATUS: isActive,

        GROUPCODE: scode,
        GROUPNAME: grp?.PARNAM || "",
        MAINGROUP: grp?.GROUP || "",
        PARENTGROUP: grp?.GCODE || "",

        /*
         * Territory fields
         */
        state1,
        country,
        ZONE: zone,

        CITY: city,
        Area: area,
        station,
        route,

        /*
         * Keep original ORDER territory codes
         * available for debugging / editing if needed.
         */
        _orderTerritory: order
          ? {
              STATE1: orderState1,
              STATE2: orderState2,
              ZONE: orderZone,
              CITY: orderCity,
              AREA: orderArea,
              STATION: orderStation,
              ROUT: order?.ROUT || "",
              ROUTE: order?.ROUTE || "",
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/customers error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to load customers",
      },
      {
        status: 500,
      }
    );
  }
}

/* ---------------------------------------------------------- */
/* POST                                                         */
/* ---------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    if (!body.PARNAM || !String(body.PARNAM).trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Party / Customer Name (PARNAM) is required",
        },
        {
          status: 400,
        }
      );
    }

    const numericFields = [
      "BALANCE",
      "CREDIT",
      "DEBIT",
      "OPNING",
      "OPENING",
      "CLBAL",
      "DISCOUNT",
      "DUEDAYS",
      "DAYS",
      "FINAL",
    ];

    const customerData: Record<string, any> = {};

    /* ------------------------------------------------------ */
    /* Copy incoming fields                                    */
    /* ------------------------------------------------------ */

    Object.keys(body).forEach((key) => {
      if (
        body[key] !== undefined &&
        body[key] !== null
      ) {
        customerData[key] = body[key];
      }
    });

    /* ------------------------------------------------------ */
    /* Basic fields                                             */
    /* ------------------------------------------------------ */

    customerData.PARNAM =
      String(body.PARNAM).trim();

    customerData.CODEP =
      body.CODEP &&
      String(body.CODEP).trim()
        ? String(body.CODEP).trim()
        : `CUST_${Date.now()
            .toString()
            .slice(-6)}`;

    customerData.ORDNO =
      customerData.CODEP;

    customerData.SALDR = "Y";

    customerData.STATUS =
      body.STATUS || "Y";

    /* ------------------------------------------------------ */
    /* VFP keys                                                 */
    /* ------------------------------------------------------ */

    customerData._vfpTable =
      body._vfpTable ||
      "vfp_new_folder_order";

    customerData._vfpSourceKey =
      body._vfpSourceKey ||
      `MANUAL_CUST_${customerData.CODEP}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    /* ------------------------------------------------------ */
    /* Numeric fields                                           */
    /* ------------------------------------------------------ */

    numericFields.forEach((field) => {
      if (
        field in body &&
        body[field] !== "" &&
        body[field] !== null &&
        body[field] !== undefined
      ) {
        const num = Number(body[field]);

        customerData[field] =
          isNaN(num) ? 0 : num;
      }
    });

    /* ------------------------------------------------------ */
    /* Create customer                                          */
    /* ------------------------------------------------------ */

    const newCustomer =
      await Customer.create(customerData);

    return NextResponse.json(
      {
        success: true,
        message:
          "Customer created successfully",
        data: newCustomer,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "POST /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create customer",
      },
      {
        status: 500,
      }
    );
  }
}