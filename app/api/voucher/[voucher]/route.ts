import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import { getVoucher } from "@/lib/voucher/VoucherEngine";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";
import Order from "@/models/Order";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      voucher: string;
    }>;
  }
) {
  try {
    await connectDB();

    const { voucher } = await params;
    const voucherNo = Number(voucher);

    if (!Number.isFinite(voucherNo)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Voucher Number",
        },
        { status: 400 }
      );
    }

    const restriction = await getMrTerritoryRestriction();

    // Admin is unrestricted. For every other user, the voucher must belong
    // to a party/customer that is inside the user's hierarchy scope.
    if (restriction.isMrRestricted) {
      // Inventory voucher: CODEP is the party/order code on the header.
      const inventoryHeader: any = await SalesMdis.findOne({
        VOUCHER: voucherNo,
      }).lean();

      if (inventoryHeader) {
        const partyCode = String(
          inventoryHeader.CODEP ?? inventoryHeader.ORDNO ?? inventoryHeader.CODE ?? ""
        ).trim();

        const party = partyCode
          ? await Order.findOne({ ORDNO: partyCode }).lean()
          : null;

        const partyForAccess = party || {
          ORDNO: partyCode,
          CODEP: partyCode,
          CODE: partyCode,
          COMPANY: inventoryHeader.COMPANY,
        };

        if (!restriction.isPartyAllowed(partyForAccess)) {
          return NextResponse.json(
            {
              success: false,
              message: "Voucher not found",
            },
            { status: 404 }
          );
        }
      } else {
        // Accounting voucher: a voucher can contain multiple ledger rows.
        // Identify all ledger codes that are actual parties. If a voucher has
        // party rows, every such party must be inside the user's scope.
        // If no party can be resolved, fail closed for restricted users.
        const accountingRows: any[] = await GLedger.find({
          VOUCHER: voucherNo,
        })
          .select("CODE")
          .lean();

        if (!accountingRows.length) {
          return NextResponse.json(
            {
              success: false,
              message: "Voucher not found",
            },
            { status: 404 }
          );
        }

        const codes = Array.from(
          new Set(
            accountingRows
              .map((row: any) => String(row.CODE ?? "").trim())
              .filter(Boolean)
          )
        );

        const parties: any[] = codes.length
          ? await Order.find({ ORDNO: { $in: codes } }).lean()
          : [];

        if (!parties.length) {
          return NextResponse.json(
            {
              success: false,
              message: "Voucher not found",
            },
            { status: 404 }
          );
        }

        const everyPartyAllowed = parties.every((party: any) =>
          restriction.isPartyAllowed(party)
        );

        // If a ledger code looks like a party but its Order record is missing,
        // do not expose the voucher because its ownership cannot be verified.
        if (parties.length !== codes.length || !everyPartyAllowed) {
          return NextResponse.json(
            {
              success: false,
              message: "Voucher not found",
            },
            { status: 404 }
          );
        }
      }
    }

    const data = await getVoucher(voucherNo);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
