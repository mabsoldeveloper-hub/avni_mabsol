import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ voucher: string }> }
) {
  try {
    await dbConnect();

    const { voucher } = await params;

    const voucherNo = Number(voucher);

    // Invoice Header
    const header = await SalesMdis.findOne({
      VOUCHER: Number((await params).voucher)
  });

    // const header = await SalesMdis.findOne({
    //   VOUCHER: voucherNo,
    // }).lean();

    if (!header) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice not found",
        },
        { status: 404 }
      );
    }

    /* ---------------------------------------------------------- */
    /* Hierarchy access control                                   */
    /* ---------------------------------------------------------- */
    const restriction = await getMrTerritoryRestriction();

    /*
     * SalesMdis.CODEP is the customer/account code used by the invoice.
     * Verify the party BEFORE loading invoice items or returning any
     * invoice/customer data. For restricted users, return 404 so an
     * inaccessible invoice cannot be distinguished from a missing one.
     */
    if (restriction.isMrRestricted) {
      const invoiceCustomer: any = await Customer.findOne({
        ORDNO: header.CODEP,
      }).lean();

      const partyForAuthorization = invoiceCustomer || {
        ORDNO: header.CODEP,
        CODEP: header.CODEP,
        CODE: header.CODEP,
        COMPANY: header.COMPANY,
        SCODE: header.SCODE,
      };

      if (!restriction.isPartyAllowed(partyForAuthorization)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invoice not found",
          },
          { status: 404 }
        );
      }
    }

    // Invoice Items
    // const items = await SalesDis.find({
    //   VOUCHER: voucherNo,
    // }).lean();

    const items = await SalesDis.find({
      VOUCHER: Number((await params).voucher)
    });


    // Customer
    const customer = await Customer.findOne({
      ORDNO: header.CODEP,
    }).lean();

    // Product Details
    const productCodes = items.map((i: any) => i.CODE);

    const products = await Product.find({
      CODE: { $in: productCodes },
    }).lean();

    const productMap = new Map(
      products.map((p: any) => [p.CODE, p])
    );

    const finalItems = items.map((item: any) => ({
      ...item,
      product: productMap.get(item.CODE) || null,
    }));

    return NextResponse.json({
      success: true,

      header,

      customer,

      items: finalItems,

      summary: {
        taxable: header.AMOUNTT,
        gst: header.TAXAMO,
        round: header.ROUND,
        total: header.FINAL,
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}