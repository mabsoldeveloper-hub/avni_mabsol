import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import SaleType from "@/models/SaleType";


export async function GET() {
  try {
    await connectDB();

    const companies = await SaleType.find({
      SGCODE: "ZZZZZZ",
    })
      .select("SCODE SNAME")
      .sort({ SNAME: 1 })
      .lean();

    // Deduplicate by companyCode and companyName so each company appears exactly once
    const seen = new Set<string>();
    const data: any[] = [];
    for (const item of companies) {
      const code = String(item.SCODE || "").trim();
      const name = String(item.SNAME || "").trim();
      if (!code && !name) continue;
      const key = `${code.toUpperCase()}___${name.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        data.push({
          _id: item._id,
          companyCode: code,
          companyName: name,
          status: "Active",
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}