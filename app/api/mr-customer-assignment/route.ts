import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// =======================
// GET - List MR Customer Assignments
// =======================
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "Active";

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerCode: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const records = await MrCustomerAssignment.find(filter)
      .populate("userId", "name email employeeCode mobile designation")
      .sort({ userName: 1, customerName: 1 });

    return NextResponse.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch MR customer assignments" },
      { status: 500 }
    );
  }
}

// =======================
// POST - Bulk Save Customer Assignments for an MR
// =======================
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, assignedCustomers } = body;
    // assignedCustomers is an array of { customerCode, customerName, city, area }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "MR Executive User ID is required." },
        { status: 400 }
      );
    }

    const mrUser = await User.findById(userId);
    if (!mrUser) {
      return NextResponse.json(
        { success: false, message: "Selected MR Executive not found." },
        { status: 404 }
      );
    }

    const items = Array.isArray(assignedCustomers) ? assignedCustomers : [];

    // Deduplicate incoming customer items by customerCode to prevent E11000 duplicate key error
    const uniqueMap = new Map<string, any>();
    items.forEach((c: any) => {
      const code = (c.customerCode || c.code || "").toString().trim();
      const name = (c.customerName || c.name || "").toString().trim();
      if (code && !uniqueMap.has(code.toLowerCase())) {
        uniqueMap.set(code.toLowerCase(), {
          customerCode: code,
          customerName: name,
          city: (c.city || "").toString().trim(),
          area: (c.area || "").toString().trim(),
        });
      }
    });

    const uniqueItems = Array.from(uniqueMap.values());

    // Remove old active assignments for this MR
    await MrCustomerAssignment.deleteMany({ userId });

    // Bulk insert new unique assignments
    if (uniqueItems.length > 0) {
      const documents = uniqueItems.map((c: any) => ({
        userId,
        userName: mrUser.name,
        employeeCode: mrUser.employeeCode || "",
        customerCode: c.customerCode,
        customerName: c.customerName,
        city: c.city,
        area: c.area,
        assignedBy: currentUser?._id || null,
        status: "Active",
      }));

      await MrCustomerAssignment.insertMany(documents, { ordered: false });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${uniqueItems.length} customer(s) to ${mrUser.name}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save customer assignments" },
      { status: 500 }
    );
  }
}

// =======================
// DELETE - Remove Customer Assignment
// =======================
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    const userId = searchParams.get("userId") || "";
    const customerCode = searchParams.get("customerCode") || "";

    if (id) {
      await MrCustomerAssignment.findByIdAndDelete(id);
    } else if (userId && customerCode) {
      await MrCustomerAssignment.deleteOne({ userId, customerCode });
    } else {
      return NextResponse.json(
        { success: false, message: "Assignment ID or (userId and customerCode) are required." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer assignment removed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
