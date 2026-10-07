import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();

    let userEmail = user?.email || "";
    let userId = (user as any)?._id || (user as any)?.id || "";

    if (!userEmail) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const payload = jwt.verify(
            token,
            process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026"
          ) as any;
          if (payload?.email) {
            userEmail = payload.email;
          }
          if (payload?.id) {
            userId = payload.id;
          }
        } catch {
          // Token invalid or expired
        }
      }
    }

    if (!userEmail) {
      userEmail = request.nextUrl.searchParams.get("email") || "";
    }

    let userDoc: any = null;
    if (userEmail) {
      userDoc = await User.findOne({ email: userEmail.toLowerCase().trim() }).lean();
    } else if (userId) {
      userDoc = await User.findById(userId).lean();
    }

    const tenantId = userDoc?.tenantId || (user as any)?.tenantId || "";
    const primaryCompanyId = userDoc?.companyId || (user as any)?.companyId || null;

    const branchesList: Array<{
      id: string;
      companyName: string;
      companyCode: string;
      isHeadOffice: boolean;
      gstNo?: string;
      city?: string;
    }> = [];

    const isPlaceholderComp = (val?: string) => {
      if (!val) return true;
      const lower = val.trim().toLowerCase();
      return (
        lower === "default" ||
        lower === "organization" ||
        lower === "your organization" ||
        lower === "test" ||
        lower === "new folder" ||
        lower === "new_folder" ||
        lower.startsWith("new folder") ||
        lower.startsWith("new_folder")
      );
    };

    const cleanCompText = (name?: string) => {
      if (!name) return "";
      let s = name.trim();
      s = s.replace(/[\s\-_/\\|]*new[\s_-]*folder(\s*\(\d+\))?[\s\-_/\\|]*/gi, " ").trim();
      s = s.replace(/^[-_\s/\\|]+|[-_\s/\\|]+$/g, "").trim();
      return isPlaceholderComp(s) ? "" : s;
    };

    if (tenantId || primaryCompanyId) {
      const queryOr: any[] = [];
      if (tenantId) queryOr.push({ tenantId });
      if (primaryCompanyId) {
        queryOr.push({ _id: primaryCompanyId });
        queryOr.push({ parentCompanyId: primaryCompanyId });
      }

      const matchingCompanies: any[] = await Company.find({ $or: queryOr })
        .sort({ isHeadOffice: -1, createdAt: 1 })
        .lean();

      for (const comp of matchingCompanies) {
        const rawName = (comp.companyName || comp.name || "").trim();
        const compName = cleanCompText(rawName);
        const compCode = (comp.companyCode || comp.code || "").trim().toUpperCase();

        if (compName && !isPlaceholderComp(compName)) {
          branchesList.push({
            id: comp._id.toString(),
            companyName: compName,
            companyCode: isPlaceholderComp(compCode) ? "" : compCode,
            isHeadOffice: Boolean(comp.isHeadOffice),
            gstNo: comp.gstNo || "",
            city: comp.city || "",
          });
        }

        // Include any branch units defined in additionalGstins
        if (Array.isArray(comp.additionalGstins)) {
          for (let i = 0; i < comp.additionalGstins.length; i++) {
            const sub = comp.additionalGstins[i];
            const rawSub = (sub.branchName || `${compName} - Branch ${i + 1}`).trim();
            const subName = cleanCompText(rawSub);
            if (subName) {
              const subCode = sub.stateCode ? `B${sub.stateCode}` : `${compCode}_B${i + 1}`;
              branchesList.push({
                id: `${comp._id}_branch_${i + 1}`,
                companyName: subName,
                companyCode: subCode,
                isHeadOffice: false,
                gstNo: sub.gstNo || "",
                city: sub.city || "",
              });
            }
          }
        }
      }
    }

    // Fallback if no company documents are linked but user record has company details
    if (branchesList.length === 0 && userDoc) {
      const uCompName = cleanCompText(userDoc.companyName || "");
      const uCompCode = (userDoc.companyCode || "").trim().toUpperCase();
      if (uCompName && !isPlaceholderComp(uCompName)) {
        branchesList.push({
          id: "primary_user_comp",
          companyName: uCompName,
          companyCode: isPlaceholderComp(uCompCode) ? "" : uCompCode,
          isHeadOffice: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      branches: branchesList,
      totalBranches: branchesList.length,
      tenantId,
    });
  } catch (err: any) {
    console.error("Failed to fetch branches:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
