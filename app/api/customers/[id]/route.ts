import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";

import AccountGroup from "@/models/AccountGroup";

import Order from "@/models/Order";

import SaleType from "@/models/SaleType";
import Pendings from "@/models/Pendings";
import Notification from "@/models/Notification";
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

    /* ------------------------------------------------------ */
    /* Financial Health: Credit Limit, Days Remaining, Bill Limit Alerts */
    /* ------------------------------------------------------ */
    const creditLimit = Number(customerDoc.CREDIT ?? 0);
    const outstandingBalance = Number(customerDoc.BALANCE ?? customerDoc.FINAL ?? 0);
    const dueDaysLimit = Number(customerDoc.DUEDAYS ?? customerDoc.DAYS ?? 0);
    const billLimit = Number(
      customerDoc.BILL_LIMIT ?? customerDoc.BILLLIMIT ?? customerDoc.MAXBILLS ?? 0
    );

    // 1. Credit Limit Exceeded Check
    const isCreditLimitExceeded = creditLimit > 0 && outstandingBalance > creditLimit;
    const excessCreditAmount = isCreditLimitExceeded ? Math.round(outstandingBalance - creditLimit) : 0;
    const creditUtilization = creditLimit > 0 ? Math.round((outstandingBalance / creditLimit) * 100) : 0;

    let totalPendingBills = 0;
    let overdueBillsCount = 0;
    let maxOverdueDays = 0;
    let overdueAmount = 0;
    let minDaysRemaining = 999;
    let oldestPendingBillNo = "";
    let oldestBillDate = "";

    try {
      if (orderKeys.length) {
        const pendingInvoices: any[] = await Pendings.find({
          ORD: { $in: orderKeys },
        }).sort({ DDATE: 1 }).lean();

        const todayMs = Date.now();
        for (const inv of pendingInvoices) {
          const bal = Math.abs(Number(inv.BALANCE ?? 0));
          if (bal > 0) {
            totalPendingBills++;
            if (!oldestPendingBillNo) {
              oldestPendingBillNo = String(inv.VCN || inv.VOUCHER || "");
              oldestBillDate = String(inv.DDATE || "");
            }

            let billOverdueDays = 0;
            if (inv.DDATE) {
              const billMs = new Date(inv.DDATE).getTime();
              const diffDays = Math.floor((todayMs - billMs) / (1000 * 60 * 60 * 24));
              const allowedDays = dueDaysLimit > 0 ? dueDaysLimit : (Number(inv.DUEDAYS) || 0);

              const remaining = allowedDays - diffDays;
              if (remaining < minDaysRemaining) {
                minDaysRemaining = remaining;
              }

              if (diffDays > allowedDays) {
                billOverdueDays = diffDays - allowedDays;
              }
            }

            if (billOverdueDays > 0 || Number(inv.DUEDAYS || 0) > 0) {
              overdueBillsCount++;
              overdueAmount += bal;
              if (billOverdueDays > maxOverdueDays) {
                maxOverdueDays = billOverdueDays;
              }
            }
          }
        }
      }
    } catch (pendingsErr) {
      console.warn("Error calculating pendings overdue:", pendingsErr);
    }

    if (minDaysRemaining === 999) {
      minDaysRemaining = dueDaysLimit;
    }

    // 2. Days Kam Bache / Days Expiring Soon Check
    const isDaysKamBache = dueDaysLimit > 0 && minDaysRemaining <= 3 && minDaysRemaining >= 0 && totalPendingBills > 0;
    const isDaysExpired = maxOverdueDays > 0;
    const isDayLimitExceeded = isDaysKamBache || isDaysExpired;

    // 3. Bill Limit / Number of Bills Exceeded Check
    const isBillLimitExceeded = billLimit > 0 && totalPendingBills > billLimit;
    const excessBillsCount = isBillLimitExceeded ? totalPendingBills - billLimit : 0;

    const financialAlerts = {
      // Credit Limit
      creditLimit,
      outstandingBalance,
      isCreditLimitExceeded,
      excessCreditAmount,
      creditUtilization,

      // Days Limit
      dueDaysLimit,
      minDaysRemaining: minDaysRemaining === 999 ? 0 : minDaysRemaining,
      isDaysKamBache,
      isDaysExpired,
      isDayLimitExceeded,
      maxOverdueDays,
      overdueBillsCount,
      overdueAmount,
      oldestPendingBillNo,
      oldestBillDate,

      // Bill Limit
      billLimit,
      totalPendingBills,
      isBillLimitExceeded,
      excessBillsCount,
    };

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

      /* Financial alerts */
      financialAlerts,
      isCreditLimitExceeded,
      excessCreditAmount,
      creditUtilization,
      isDayLimitExceeded,
      isDaysKamBache,
      isDaysExpired,
      minDaysRemaining: minDaysRemaining === 999 ? 0 : minDaysRemaining,
      maxOverdueDays,
      overdueAmount,
      overdueBillsCount,
      billLimit,
      totalPendingBills,
      isBillLimitExceeded,
      excessBillsCount,

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
/* PATCH - Update customer details, credit limit, terms, etc. */
/* ---------------------------------------------------------- */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

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

    const body = await request.json();

    const numericFields = [
      "CREDIT",
      "DUEDAYS",
      "DAYS",
      "BILL_LIMIT",
      "BILLLIMIT",
      "MAXBILLS",
      "BALANCE",
      "DISCOUNT",
      "OPNING",
      "OPENING",
      "CLBAL",
      "DEBIT",
      "FINAL",
    ] as const;

    const stringFields = [
      "PARNAM",
      "REF",
      "PHONE1",
      "PHONE2",
      "MAILNAM",
      "STATUS",
      "PRICE",
      "PARADD",
      "PARADD2",
      "PARADD3",
      "CITY",
      "STATE",
      "state1",
      "country",
      "PINCODE",
      "PIN",
      "Area",
      "AREA",
      "station",
      "route",
      "ROUT",
      "ZONE",
      "GSTNO",
      "DLNO",
      "DLNO2",
      "PANNO",
      "FSSAINO",
      "DSM",
      "SALESMAN",
      "ASM",
      "RSM",
      "COMPANY",
      "TINNO",
      "STAXNO",
      "CSTNO",
      "GCODE",
      "SCODE",
    ] as const;

    const updates: Record<string, any> = {};

    // String fields
    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = clean(body[field]);
      }
    }

    // Numeric fields
    for (const field of numericFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const val = body[field];
        if (val === "" || val === null || val === undefined) {
          updates[field] = 0;
        } else {
          const num = Number(val);
          updates[field] = isNaN(num) ? 0 : num;
        }
      }
    }

    // Field normalizations & synchronizations
    if (Object.prototype.hasOwnProperty.call(body, "country") && !updates.country) {
      updates.country = "India";
    }

    if (Object.prototype.hasOwnProperty.call(body, "DUEDAYS")) {
      updates.DAYS = updates.DUEDAYS;
    } else if (Object.prototype.hasOwnProperty.call(body, "DAYS")) {
      updates.DUEDAYS = updates.DAYS;
    }

    if (Object.prototype.hasOwnProperty.call(body, "BILL_LIMIT")) {
      updates.BILLLIMIT = updates.BILL_LIMIT;
      updates.MAXBILLS = updates.BILL_LIMIT;
    } else if (Object.prototype.hasOwnProperty.call(body, "BILLLIMIT")) {
      updates.BILL_LIMIT = updates.BILLLIMIT;
      updates.MAXBILLS = updates.BILLLIMIT;
    }

    if (Object.prototype.hasOwnProperty.call(body, "state1")) {
      updates.STATE = updates.state1;
    } else if (Object.prototype.hasOwnProperty.call(body, "STATE")) {
      updates.state1 = updates.STATE;
    }

    if (Object.prototype.hasOwnProperty.call(body, "Area")) {
      updates.AREA = updates.Area;
    } else if (Object.prototype.hasOwnProperty.call(body, "AREA")) {
      updates.Area = updates.AREA;
    }

    if (Object.prototype.hasOwnProperty.call(body, "route")) {
      updates.ROUT = updates.route;
    } else if (Object.prototype.hasOwnProperty.call(body, "ROUT")) {
      updates.route = updates.ROUT;
    }

    if (Object.prototype.hasOwnProperty.call(body, "STATUS")) {
      const st = String(body.STATUS || "").trim().toUpperCase();
      updates.STATUS = (st === "Y" || st === "ACTIVE" || st === "YES") ? "Y" : "N";
    }

    if (Object.prototype.hasOwnProperty.call(body, "OPNING")) {
      updates.OPENING = updates.OPNING;
    } else if (Object.prototype.hasOwnProperty.call(body, "OPENING")) {
      updates.OPNING = updates.OPENING;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { success: false, message: "No valid fields received to update" },
        { status: 400 }
      );
    };

    const updatedCustomer: any = await Customer.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true, strict: false }
    ).lean();

    const state2Name =
      getSaleTypeName(
        orderState2,
        "STATE2"
      ) ||
      getSaleTypeName(
        orderState2,
        ""
      );

    // Check if updated values breach credit limit and record Notification
    const currentBal = Number(updatedCustomer.BALANCE ?? updatedCustomer.FINAL ?? 0);
    const currentCredit = Number(updatedCustomer.CREDIT ?? 0);
    const isCreditLimitExceeded = currentCredit > 0 && currentBal > currentCredit;

    if (isCreditLimitExceeded) {
      try {
        await Notification.create({
          title: `⚠️ Credit Limit Exceeded: ${updatedCustomer.PARNAM}`,
          message: `Customer ${updatedCustomer.PARNAM} has exceeded credit limit! Balance: ₹${currentBal.toLocaleString("en-IN")}, Limit: ₹${currentCredit.toLocaleString("en-IN")}.`,
          type: "CREDIT_LIMIT_EXCEEDED",
          category: "FINANCIAL",
          severity: "warning",
          targetRole: "All",
          entityId: String(id),
          actionUrl: `/dashboard/customers/view/${id}`,
          metadata: {
            customerId: id,
            customerName: updatedCustomer.PARNAM,
            balance: currentBal,
            creditLimit: currentCredit,
            dueDays: updatedCustomer.DUEDAYS,
          },
        });
      } catch (notifErr) {
        console.warn("Failed to create credit limit notification:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Customer details and limits updated successfully",
      data: updatedCustomer,
      isCreditLimitExceeded,
    });
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