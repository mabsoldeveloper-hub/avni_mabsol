import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const StateDistrict =
  mongoose.models.StateDistrict ||
  mongoose.model(
    "StateDistrict",
    new mongoose.Schema(
      {
        state: { type: String, required: true, trim: true },
        districts: { type: [String], default: [] },
      },
      {
        collection: "StateDistrict",
        strict: false,
      }
    )
  );

export async function GET() {
  try {
    await connectDB();

    const data = await StateDistrict.find(
      {},
      { _id: 0, state: 1, districts: 1 }
    )
      .sort({ state: 1 })
      .lean();

    const normalized = data
      .map((item: any) => ({
        state: String(item.state || "").trim(),
        districts: Array.isArray(item.districts)
          ? item.districts
              .map((d: any) => String(d || "").trim())
              .filter(Boolean)
          : [],
      }))
      .filter((item: any) => item.state);

    return NextResponse.json(
      {
        success: true,
        data: normalized,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("StateDistrict API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load StateDistrict master",
        data: [],
      },
      { status: 500 }
    );
  }
}
