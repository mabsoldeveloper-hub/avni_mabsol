import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdminUser } from "@/lib/services/superAdmin.service";
import ExeDownloadLog from "@/models/ExeDownloadLog";
import ExeSyncLog from "@/models/ExeSyncLog";
import User from "@/models/User";
import Company from "@/models/Company";
import VfpConfig from "@/models/VfpConfig";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Only Super Administrator can access this area.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const downloadFormat = searchParams.get("format") || "all";
    const companyIdParam = searchParams.get("companyId") || "";
    const branchTypeParam = searchParams.get("branchType") || "all";
    const workstationFilter = searchParams.get("workstationFilter") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const suspendedOnly = searchParams.get("suspendedOnly") === "true";
    const detailType = searchParams.get("detailType");
    const detailId = searchParams.get("detailId");

    // Super Admin identifier definitions to completely exclude from tenant listings
    const superAdminEmails = [
      (process.env.SUPER_ADMIN_EMAIL || "mabsoldeveloper@gmail.com").toLowerCase().trim(),
      "mabsoldeveloper@gmail.com",
    ];

    const superAdminExcludeFilter = {
      email: { $nin: superAdminEmails },
      roleType: { $nin: ["SuperAdmin", "super_admin", "superadmin", "SUPERADMIN"] },
      role: { $nin: ["SuperAdmin", "super_admin", "superadmin", "SUPERADMIN"] },
      isSuperAdmin: { $ne: true },
    };

    // Deep Detail Inspector queries on demand
    if (detailType === "user" && detailId && mongoose.Types.ObjectId.isValid(detailId)) {
      const targetUser = await User.findById(detailId).populate("companyId").lean() as any;
      if (!targetUser) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
      }
      const email = targetUser.email?.toLowerCase();
      const userCfg = await VfpConfig.findOne({ email }).lean() as any;
      const [userDownloads, userSyncs] = await Promise.all([
        ExeDownloadLog.find({ userEmail: email }).sort({ createdAt: -1 }).limit(100).lean(),
        ExeSyncLog.find({ userEmail: email }).sort({ startedAt: -1 }).limit(100).lean(),
      ]);

      return NextResponse.json({
        success: true,
        user: {
          ...targetUser,
          licenseKey: userCfg?.license || "",
          licenseExpiresAt: userCfg?.licenseExpiresAt || null,
          licenseStatus: userCfg?.licenseStatus || "active",
          devices: userCfg?.authorizedDevices || [],
          downloads: userDownloads,
          syncs: userSyncs,
        },
      });
    }

    if (detailType === "company" && detailId && mongoose.Types.ObjectId.isValid(detailId)) {
      const targetCompany = await Company.findById(detailId).lean() as any;
      if (!targetCompany) {
        return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
      }

      const [compUsers, subBranches, compDownloads, compSyncs] = await Promise.all([
        User.find({ companyId: detailId, ...superAdminExcludeFilter })
          .select("_id name email mobile role roleType designation employeeCode exeAccessSuspended exeSuspendedAt exeSuspendedReason status createdAt")
          .lean(),
        Company.find({ parentCompanyId: detailId, isDeleted: { $ne: true } }).lean(),
        ExeDownloadLog.find({ companyId: detailId }).sort({ createdAt: -1 }).limit(100).lean(),
        ExeSyncLog.find({ companyId: detailId }).sort({ startedAt: -1 }).limit(100).lean(),
      ]);

      return NextResponse.json({
        success: true,
        company: {
          ...targetCompany,
          users: compUsers,
          subBranches,
          downloads: compDownloads,
          syncs: compSyncs,
        },
      });
    }

    // 1. Calculate global overview statistics (excluding Super Admin)
    const [
      totalDownloads,
      totalSyncRuns,
      successfulSyncs,
      failedSyncs,
      rejectedSyncs,
      suspendedUsersCount,
    ] = await Promise.all([
      ExeDownloadLog.countDocuments({ userEmail: { $nin: superAdminEmails } }),
      ExeSyncLog.countDocuments({ userEmail: { $nin: superAdminEmails } }),
      ExeSyncLog.countDocuments({ status: "success", userEmail: { $nin: superAdminEmails } }),
      ExeSyncLog.countDocuments({ status: "failed", userEmail: { $nin: superAdminEmails } }),
      ExeSyncLog.countDocuments({ status: "rejected_suspended", userEmail: { $nin: superAdminEmails } }),
      User.countDocuments({ exeAccessSuspended: true, ...superAdminExcludeFilter }),
    ]);

    // Inspect VfpConfig authorized devices & licenses
    const allConfigs = await VfpConfig.find({}).lean();
    let activeWorkstationsCount = 0;
    let suspendedWorkstationsCount = 0;
    let liveAgentsCount = 0;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeLicensesSet = new Set<string>();

    for (const cfg of allConfigs) {
      if (cfg.license) activeLicensesSet.add(cfg.license);
      const devices = Array.isArray(cfg.authorizedDevices) ? cfg.authorizedDevices : [];
      for (const d of devices) {
        if (d.status === "suspended") {
          suspendedWorkstationsCount++;
        } else {
          activeWorkstationsCount++;
        }
        if (d.lastSeenAt && new Date(d.lastSeenAt) > tenMinutesAgo) {
          liveAgentsCount++;
        }
      }
    }

    const stats = {
      totalDownloads,
      totalSyncRuns,
      successfulSyncs,
      failedSyncs,
      rejectedSyncs,
      suspendedUsersCount,
      activeWorkstationsCount,
      suspendedWorkstationsCount,
      liveAgentsCount,
      activeLicensesCount: activeLicensesSet.size,
    };

    // 2. Fetch Downloads with pagination & search (excluding Super Admin)
    const downloadQuery: any = {
      userEmail: { $nin: superAdminEmails },
    };
    if (downloadFormat !== "all") {
      downloadQuery.downloadFormat = downloadFormat;
    }
    if (companyIdParam && mongoose.Types.ObjectId.isValid(companyIdParam)) {
      downloadQuery.companyId = companyIdParam;
    }
    if (search) {
      const sRegex = new RegExp(search, "i");
      downloadQuery.$or = [
        { companyName: sRegex },
        { companyCode: sRegex },
        { userName: sRegex },
        { userEmail: sRegex },
        { ipAddress: sRegex },
        { os: sRegex },
      ];
    }

    const [downloadDocs, totalDownloadCount] = await Promise.all([
      ExeDownloadLog.find(downloadQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExeDownloadLog.countDocuments(downloadQuery),
    ]);

    // 3. Fetch Sync Logs with pagination & search (excluding Super Admin)
    const syncQuery: any = {
      userEmail: { $nin: superAdminEmails },
    };
    if (status !== "all") {
      syncQuery.status = status;
    }
    if (companyIdParam && mongoose.Types.ObjectId.isValid(companyIdParam)) {
      syncQuery.companyId = companyIdParam;
    }
    if (search) {
      const sRegex = new RegExp(search, "i");
      syncQuery.$or = [
        { companyName: sRegex },
        { companyCode: sRegex },
        { userName: sRegex },
        { userEmail: sRegex },
        { licenseKey: sRegex },
        { deviceId: sRegex },
        { deviceName: sRegex },
        { error: sRegex },
      ];
    }

    const [syncDocs, totalSyncCount] = await Promise.all([
      ExeSyncLog.find(syncQuery)
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExeSyncLog.countDocuments(syncQuery),
    ]);

    // 4. Build Enterprise Hierarchy Tree (Head Offices and Sub-Branches)
    const allCompanies = await Company.find({ isDeleted: { $ne: true } })
      .select("_id companyName companyCode isHeadOffice parentCompanyId ownerName email mobile website gstNo panNo drugLicenseNo address city state pincode status createdAt")
      .lean();

    // Map companyId -> users (Strictly exclude Super Admin)
    const allUsers = await User.find({
      ...superAdminExcludeFilter,
      ...(suspendedOnly ? { exeAccessSuspended: true } : {}),
    })
      .select("_id name email mobile role roleType designation employeeCode companyId exeAccessSuspended exeSuspendedAt exeSuspendedReason exeSuspendedBy status isApproved createdAt lastLogin")
      .populate("companyId")
      .lean();

    // Aggregate downloads & sync counts per company
    const downloadCountsByComp = await ExeDownloadLog.aggregate([
      { $match: { companyId: { $ne: null } } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } },
    ]);
    const downloadMap = new Map<string, number>();
    for (const d of downloadCountsByComp) {
      downloadMap.set(String(d._id), d.count);
    }

    const syncStatsByComp = await ExeSyncLog.aggregate([
      { $match: { companyId: { $ne: null } } },
      {
        $group: {
          _id: "$companyId",
          totalSyncs: { $sum: 1 },
          lastSyncAt: { $max: "$startedAt" },
          successCount: {
            $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected_suspended"] }, 1, 0] },
          },
        },
      },
    ]);
    const syncMap = new Map<string, any>();
    for (const s of syncStatsByComp) {
      syncMap.set(String(s._id), s);
    }

    // Attach workstations from VfpConfig
    const companyDevicesMap = new Map<string, any[]>();
    for (const cfg of allConfigs) {
      const email = cfg.email?.toLowerCase();
      const devices = Array.isArray(cfg.authorizedDevices) ? cfg.authorizedDevices : [];
      if (devices.length > 0) {
        const user = allUsers.find((u) => u.email?.toLowerCase() === email);
        if (user && user.companyId) {
          const compIdStr = String(typeof user.companyId === "object" ? (user.companyId as any)._id : user.companyId);
          const current = companyDevicesMap.get(compIdStr) || [];
          companyDevicesMap.set(compIdStr, [...current, ...devices.map(d => ({ ...d, configLicense: cfg.license, ownerEmail: email }))]);
        }
      }
    }

    // Separate head offices and sub branches
    const headOffices: any[] = [];
    const subBranchesMap = new Map<string, any[]>();

    for (const comp of allCompanies) {
      const compIdStr = String(comp._id);
      const compUsers = allUsers.filter(
        (u) =>
          u.companyId &&
          String(typeof u.companyId === "object" ? (u.companyId as any)._id : u.companyId) === compIdStr
      );
      const compDownloads = downloadMap.get(compIdStr) || 0;
      const compSync = syncMap.get(compIdStr) || { totalSyncs: 0, lastSyncAt: null, successCount: 0, rejectedCount: 0 };
      const compDevices = companyDevicesMap.get(compIdStr) || [];

      const companyData = {
        ...comp,
        users: compUsers,
        totalDownloads: compDownloads,
        totalSyncs: compSync.totalSyncs,
        lastSyncAt: compSync.lastSyncAt,
        successSyncCount: compSync.successCount,
        rejectedSyncCount: compSync.rejectedCount,
        devices: compDevices,
        allUsersSuspended: compUsers.length > 0 && compUsers.every((u) => u.exeAccessSuspended),
        anyUserSuspended: compUsers.some((u) => u.exeAccessSuspended),
      };

      if (comp.isHeadOffice !== false && !comp.parentCompanyId) {
        headOffices.push(companyData);
      } else {
        const parentId = String(comp.parentCompanyId || "unassigned");
        const list = subBranchesMap.get(parentId) || [];
        list.push(companyData);
        subBranchesMap.set(parentId, list);
      }
    }

    // Attach sub-branches to each head office
    const hierarchy = headOffices.map((head) => {
      const subs = subBranchesMap.get(String(head._id)) || [];
      const rollupDownloads = head.totalDownloads + subs.reduce((acc: number, s: any) => acc + s.totalDownloads, 0);
      const rollupSyncs = head.totalSyncs + subs.reduce((acc: number, s: any) => acc + s.totalSyncs, 0);
      const rollupDevices = [...head.devices, ...subs.flatMap((s: any) => s.devices)];

      return {
        ...head,
        subBranches: subs,
        rollupDownloads,
        rollupSyncs,
        rollupDeviceCount: rollupDevices.length,
      };
    });

    // 5. Users List with complete details (Strictly no superadmin)
    const usersList = allUsers
      .filter((u) => {
        const email = (u.email || "").toLowerCase().trim();
        const role = (u.role || u.roleType || "").toLowerCase().trim();
        return !superAdminEmails.includes(email) && !role.includes("superadmin");
      })
      .map((u) => {
        const email = u.email?.toLowerCase();
        const userCfg = allConfigs.find((c) => c.email?.toLowerCase() === email);
        const devices = userCfg && Array.isArray(userCfg.authorizedDevices) ? userCfg.authorizedDevices : [];
        const userDownloads = downloadDocs.filter((d) => d.userEmail?.toLowerCase() === email);
        const userSyncs = syncDocs.filter((s) => s.userEmail?.toLowerCase() === email);
        const compObj = typeof u.companyId === "object" ? (u.companyId as any) : null;

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          mobile: u.mobile || "",
          role: u.role || u.roleType,
          designation: u.designation || "",
          employeeCode: u.employeeCode || "",
          companyName: compObj?.companyName || "N/A",
          companyCode: compObj?.companyCode || "N/A",
          companyId: compObj?._id || u.companyId,
          companyDetails: compObj
            ? {
                _id: compObj._id,
                companyName: compObj.companyName,
                companyCode: compObj.companyCode,
                isHeadOffice: compObj.isHeadOffice !== false,
                city: compObj.city || "",
                state: compObj.state || "",
                address: compObj.address || "",
                pincode: compObj.pincode || "",
                gstNo: compObj.gstNo || "",
                panNo: compObj.panNo || "",
              }
            : null,
          exeAccessSuspended: !!u.exeAccessSuspended,
          exeSuspendedAt: u.exeSuspendedAt,
          exeSuspendedReason: u.exeSuspendedReason || "",
          exeSuspendedBy: u.exeSuspendedBy,
          licenseKey: userCfg?.license || "",
          licenseExpiresAt: userCfg?.licenseExpiresAt || null,
          licenseStatus: userCfg?.licenseStatus || "active",
          devices,
          totalDownloads: userDownloads.length,
          totalSyncs: userSyncs.length,
          recentDownloads: userDownloads.slice(0, 5),
          recentSyncs: userSyncs.slice(0, 5),
          status: u.status,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        };
      });

    return NextResponse.json({
      success: true,
      stats,
      hierarchy,
      usersList,
      downloads: {
        docs: downloadDocs,
        total: totalDownloadCount,
        page,
        totalPages: Math.ceil(totalDownloadCount / limit),
      },
      syncs: {
        docs: syncDocs,
        total: totalSyncCount,
        page,
        totalPages: Math.ceil(totalSyncCount / limit),
      },
    });
  } catch (error: any) {
    console.error("[SuperAdmin ExeLogs API] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch EXE logs and analytics",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isSuperAdminUser(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Only Super Administrator can perform this action.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: "Action parameter is required." },
        { status: 400 }
      );
    }

    // 1. Suspend User EXE Access
    if (action === "suspend_user_exe") {
      const { userId, reason } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
      }

      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }

      const suspensionReason = reason?.trim() || "Suspended by Super Administrator";

      await User.findByIdAndUpdate(userId, {
        $set: {
          exeAccessSuspended: true,
          exeSuspendedAt: new Date(),
          exeSuspendedReason: suspensionReason,
          exeSuspendedBy: currentUser._id,
        },
      });

      // Also mark authorized devices for this user's email as suspended in VfpConfig
      if (user.email) {
        await VfpConfig.updateMany(
          {
            $or: [
              { email: user.email },
              { "authorizedDevices.activationEmail": user.email },
            ],
          },
          {
            $set: {
              "authorizedDevices.$[elem].status": "suspended",
              "authorizedDevices.$[elem].suspendedAt": new Date(),
              "authorizedDevices.$[elem].suspendedReason": suspensionReason,
              "authorizedDevices.$[elem].suspendedBy": currentUser._id,
            },
          },
          {
            arrayFilters: [
              {
                $or: [
                  { "elem.activationEmail": user.email },
                  { "elem.status": "active" },
                ],
              },
            ],
          }
        ).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `EXE sync access successfully suspended for user "${user.name || user.email}".`,
      });
    }

    // 2. Restore User EXE Access
    if (action === "restore_user_exe") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
      }

      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }

      await User.findByIdAndUpdate(userId, {
        $set: {
          exeAccessSuspended: false,
          exeSuspendedAt: null,
          exeSuspendedReason: "",
          exeSuspendedBy: null,
        },
      });

      // Restore authorized devices for this user
      if (user.email) {
        await VfpConfig.updateMany(
          {
            $or: [
              { email: user.email },
              { "authorizedDevices.activationEmail": user.email },
            ],
          },
          {
            $set: {
              "authorizedDevices.$[elem].status": "active",
              "authorizedDevices.$[elem].suspendedAt": null,
              "authorizedDevices.$[elem].suspendedReason": "",
              "authorizedDevices.$[elem].suspendedBy": null,
            },
          },
          {
            arrayFilters: [{ "elem.status": "suspended" }],
          }
        ).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `EXE sync access successfully restored for user "${user.name || user.email}".`,
      });
    }

    // 3. Suspend Workstation Device
    if (action === "suspend_device") {
      const { deviceId, licenseKey, reason } = body;
      if (!deviceId) {
        return NextResponse.json({ success: false, message: "Device ID is required." }, { status: 400 });
      }

      const cleanDevId = deviceId.trim().toLowerCase();
      const suspensionReason = reason?.trim() || "Workstation suspended by Super Administrator";

      const query: any = {};
      if (licenseKey) query.license = licenseKey;

      const updated = await VfpConfig.updateMany(
        query,
        {
          $set: {
            "authorizedDevices.$[elem].status": "suspended",
            "authorizedDevices.$[elem].suspendedAt": new Date(),
            "authorizedDevices.$[elem].suspendedReason": suspensionReason,
            "authorizedDevices.$[elem].suspendedBy": currentUser._id,
          },
        },
        {
          arrayFilters: [
            { "elem.deviceId": { $regex: new RegExp(`^${cleanDevId}$`, "i") } },
          ],
        }
      );

      return NextResponse.json({
        success: true,
        message: `Workstation machine "${deviceId}" suspended successfully.`,
        modifiedCount: updated.modifiedCount,
      });
    }

    // 4. Restore Workstation Device
    if (action === "restore_device") {
      const { deviceId, licenseKey } = body;
      if (!deviceId) {
        return NextResponse.json({ success: false, message: "Device ID is required." }, { status: 400 });
      }

      const cleanDevId = deviceId.trim().toLowerCase();
      const query: any = {};
      if (licenseKey) query.license = licenseKey;

      const updated = await VfpConfig.updateMany(
        query,
        {
          $set: {
            "authorizedDevices.$[elem].status": "active",
            "authorizedDevices.$[elem].suspendedAt": null,
            "authorizedDevices.$[elem].suspendedReason": "",
            "authorizedDevices.$[elem].suspendedBy": null,
          },
        },
        {
          arrayFilters: [
            { "elem.deviceId": { $regex: new RegExp(`^${cleanDevId}$`, "i") } },
          ],
        }
      );

      return NextResponse.json({
        success: true,
        message: `Workstation machine "${deviceId}" restored to active status.`,
        modifiedCount: updated.modifiedCount,
      });
    }

    // 5. Suspend All Users in Company (and Sub-Branches)
    if (action === "suspend_company_exe") {
      const { companyId, reason, includeSubBranches = true } = body;
      if (!companyId) {
        return NextResponse.json({ success: false, message: "Company ID is required." }, { status: 400 });
      }

      const companyIdsToSuspend = [companyId];
      if (includeSubBranches) {
        const subBranches = await Company.find({ parentCompanyId: companyId }).select("_id").lean();
        for (const sub of subBranches) {
          companyIdsToSuspend.push(String(sub._id));
        }
      }

      const suspensionReason = reason?.trim() || "Company-wide EXE suspension by Super Administrator";

      const updated = await User.updateMany(
        {
          companyId: { $in: companyIdsToSuspend },
          roleType: { $ne: "super_admin" },
        },
        {
          $set: {
            exeAccessSuspended: true,
            exeSuspendedAt: new Date(),
            exeSuspendedReason: suspensionReason,
            exeSuspendedBy: currentUser._id,
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: `EXE access suspended for ${updated.modifiedCount} user(s) across ${companyIdsToSuspend.length} company branch(es).`,
        count: updated.modifiedCount,
      });
    }

    // 6. Restore All Users in Company
    if (action === "restore_company_exe") {
      const { companyId, includeSubBranches = true } = body;
      if (!companyId) {
        return NextResponse.json({ success: false, message: "Company ID is required." }, { status: 400 });
      }

      const companyIdsToRestore = [companyId];
      if (includeSubBranches) {
        const subBranches = await Company.find({ parentCompanyId: companyId }).select("_id").lean();
        for (const sub of subBranches) {
          companyIdsToRestore.push(String(sub._id));
        }
      }

      const updated = await User.updateMany(
        {
          companyId: { $in: companyIdsToRestore },
          roleType: { $ne: "super_admin" },
        },
        {
          $set: {
            exeAccessSuspended: false,
            exeSuspendedAt: null,
            exeSuspendedReason: "",
            exeSuspendedBy: null,
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: `EXE access restored for ${updated.modifiedCount} user(s) across ${companyIdsToRestore.length} company branch(es).`,
        count: updated.modifiedCount,
      });
    }

    return NextResponse.json({ success: false, message: `Unknown action: "${action}"` }, { status: 400 });
  } catch (error: any) {
    console.error("[SuperAdmin ExeLogs API] PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to perform suspension update",
      },
      { status: 500 }
    );
  }
}
