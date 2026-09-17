import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import GLedger from "@/models/GLedger";
import Pendings from "@/models/Pendings";

import mongoose from "mongoose";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    /* ---------------------------------------------------------- */
    /* Validate customer id                                       */
    /* ---------------------------------------------------------- */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid customer id",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------- */
    /* Hierarchy access control                                   */
    /* ---------------------------------------------------------- */
    const restriction = await getMrTerritoryRestriction();

    /*
     * Load the customer first only for authorization.
     * For restricted users, an inaccessible customer is returned as
     * 404 so the API does not reveal that the customer exists outside
     * their hierarchy.
     */
    const customer: any = await Customer.findById(id).lean();

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found",
        },
        { status: 404 }
      );
    }

    if (
      restriction.isMrRestricted &&
      !restriction.isPartyAllowed(customer)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found",
        },
        { status: 404 }
      );
    }

    const customerOrdno = String(customer.ORDNO || "").trim();

    if (!customerOrdno) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer account code not found",
        },
        { status: 404 }
      );
    }

    /* ---------------------------------------------------------- */
    /* Ledger Entries                                              */
    /* ---------------------------------------------------------- */
    const ledgerRows: any[] = await GLedger.find({
      CODE: customerOrdno,
    })
      .sort({
        DATE: 1,
        VOUCHER: 1,
      })
      .lean();

    let runningBalance = Number(customer.OPNING || 0);

    const ledger = ledgerRows.map((row: any) => {
      const debit = Number(row.DEBIT || 0);
      const credit = Number(row.CREDIT || 0);

      runningBalance += debit;
      runningBalance -= credit;

      let particulars = row.BOOK || "";

      switch (row.BOOK) {
        case "S":
          particulars = "Sales Invoice";
          break;

        case "R":
          particulars = "Receipt";
          break;

        case "P":
          particulars = "Payment";
          break;

        case "J":
          particulars = "Journal";
          break;

        case "A":
          particulars = "Purchase";
          break;

        case "OB":
          particulars = "Opening Balance";
          break;

        default:
          particulars = row.BOOK;
      }

      return {
        date: row.DATE,
        voucher: row.VOUCHER,
        billNo: row.REMARK1 || row.BILLNO || "",
        particulars,
        debit,
        credit,
        balance: runningBalance,
        type: row.TYPE,
        book: row.BOOK,
      };
    });

    /* ---------------------------------------------------------- */
    /* Sales Register                                              */
    /* ---------------------------------------------------------- */
    const invoices = await Pendings.find({
      ORD: customerOrdno,
    })
      .sort({
        DDATE: -1,
        VOUCHER: -1,
      })
      .lean();

    const sales = invoices.map((item: any) => {
      const amount = Math.abs(Number(item.FINAL || 0));
      const pending = Math.abs(Number(item.BALANCE || 0));
      const received = Math.max(amount - pending, 0);

      return {
        date: item.DDATE,
        dueDate: item.DUEDATE,
        voucher: item.VOUCHER,
        billNo: item.VCN || item.CHALLAN || item.VOUCHER,
        amount,
        received,
        pending,
        invType: item.INVTYPE,
        svoucher: item.SVOUCHER,
        status:
          pending <= 0
            ? "Paid"
            : received > 0
              ? "Partial"
              : "Pending",
      };
    });

    /* ---------------------------------------------------------- */
    /* Outstanding Register                                       */
    /* ---------------------------------------------------------- */
    const outstanding = sales.filter(
      (x: any) => Number(x.pending || 0) > 0
    );

    /* ---------------------------------------------------------- */
    /* Summary                                                     */
    /* ---------------------------------------------------------- */
    const totalBills = sales.length;

    const totalSales = sales.reduce(
      (sum: number, x: any) => sum + Number(x.amount || 0),
      0
    );

    const lastBill = sales.length > 0 ? sales[0] : null;

    const outstandingBills = outstanding.length;

    const outstandingAmount = outstanding.reduce(
      (sum: number, x: any) => sum + Number(x.pending || 0),
      0
    );

    const totalDebit = ledger.reduce(
      (sum: number, x: any) => sum + Number(x.debit || 0),
      0
    );

    const totalCredit = ledger.reduce(
      (sum: number, x: any) => sum + Number(x.credit || 0),
      0
    );

    /* ---------------------------------------------------------- */
    /* Response                                                     */
    /* ---------------------------------------------------------- */
    return NextResponse.json({
      success: true,

      customer: {
        id: customer._id,
        code: customer.ORDNO,
        name: customer.PARNAM,
        city: customer.CITY,
        state: customer.STATE,
        phone: customer.PHONE1 || customer.PHONE4 || "",
        gst: customer.GSTNO,
        dlno: customer.DLNO,
        opening: Number(customer.OPNING || 0),
        currentBalance: Number(customer.BALANCE || 0),
      },

      summary: {
        opening: Number(customer.OPNING || 0),
        debit: totalDebit,
        credit: totalCredit,
        closing: runningBalance,
        totalBills,
        totalSales,
        outstandingBills,
        outstandingAmount,
        ledgerBalance: Number(customer.BALANCE || 0),
        lastBillNo: lastBill?.billNo || "",
        lastBillDate: lastBill?.date || "",
      },

      ledger,
      sales,
      outstanding,
    });
  } catch (err: any) {
    console.error("GET /api/customers/ledger/[id] error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
