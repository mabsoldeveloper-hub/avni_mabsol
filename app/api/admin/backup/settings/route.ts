import { NextResponse } from "next/server";

import {
  getBackupSettings,
  saveBackupSettings,
  type BackupFrequency,
  type BackupScope,
} from "@/lib/backup-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getBackupSettings();

    if (!settings) {
      return NextResponse.json({
        settings: null,
      });
    }

    if (
      settings.receiverEmail &&
      settings.receiverEmail.toLowerCase().includes("abhishek.mabsolinfotech")
    ) {
      settings.receiverEmail = "";
    }

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error("Get backup settings error:", error);

    return NextResponse.json(
      {
        message: "Failed to get backup settings",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      receiverEmail,
      frequency,
      enabled,
      scope,
      financialYearId,
      financialYearName,
      customStartDate,
      customEndDate,
    } = body as {
      receiverEmail?: unknown;
      frequency?: unknown;
      enabled?: unknown;
      scope?: unknown;
      financialYearId?: unknown;
      financialYearName?: unknown;
      customStartDate?: unknown;
      customEndDate?: unknown;
    };

    const emailStr = typeof receiverEmail === "string" ? receiverEmail.trim() : "";
    const isEnabled = enabled !== undefined ? Boolean(enabled) : true;

    if (typeof frequency !== "string") {
      return NextResponse.json(
        {
          message: "Frequency is required",
        },
        { status: 400 }
      );
    }

    if (isEnabled && !emailStr) {
      return NextResponse.json(
        {
          message: "Receiver Gmail address is required when automated backup is enabled",
        },
        { status: 400 }
      );
    }

    const validFrequencies: BackupFrequency[] = [
      "every_minute",
      "every_2_hours",
      "every_6_hours",
      "daily",
      "weekly",
    ];

    if (!validFrequencies.includes(frequency as BackupFrequency)) {
      return NextResponse.json(
        {
          message: "Invalid frequency",
        },
        { status: 400 }
      );
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
      return NextResponse.json(
        {
          message: "Enabled must be a boolean",
        },
        { status: 400 }
      );
    }

    const validScopes: BackupScope[] = ["current_fy", "all", "custom"];
    const resolvedScope =
      typeof scope === "string" && validScopes.includes(scope as BackupScope)
        ? (scope as BackupScope)
        : "current_fy";

    const cleanedEmail =
      emailStr.toLowerCase().includes("abhishek.mabsolinfotech") ? "" : emailStr;

    const settings = await saveBackupSettings({
      receiverEmail: cleanedEmail,
      frequency: frequency as BackupFrequency,
      enabled: enabled ?? false,
      scope: resolvedScope,
      financialYearId: typeof financialYearId === "string" ? financialYearId : null,
      financialYearName: typeof financialYearName === "string" ? financialYearName : null,
      customStartDate: typeof customStartDate === "string" ? customStartDate : null,
      customEndDate: typeof customEndDate === "string" ? customEndDate : null,
    });

    try {
      const { restartBackupScheduler } = await import(
        "@/lib/services/backupScheduler.service"
      );
      restartBackupScheduler();
    } catch (schedErr: any) {
      console.warn("Could not restart backup scheduler daemon:", schedErr?.message);
    }

    return NextResponse.json({
      message: "Backup settings saved successfully",
      settings,
    });
  } catch (error) {
    console.error("Save backup settings error:", error);

    return NextResponse.json(
      {
        message: "Failed to save backup settings",
      },
      { status: 500 }
    );
  }
}