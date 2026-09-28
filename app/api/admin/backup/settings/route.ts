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

    if (
      typeof receiverEmail !== "string" ||
      !receiverEmail.trim() ||
      typeof frequency !== "string"
    ) {
      return NextResponse.json(
        {
          message: "Receiver and frequency are required",
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

    const settings = await saveBackupSettings({
      receiverEmail: receiverEmail.trim(),
      frequency: frequency as BackupFrequency,
      enabled: enabled ?? true,
      scope: resolvedScope,
      financialYearId: typeof financialYearId === "string" ? financialYearId : null,
      financialYearName: typeof financialYearName === "string" ? financialYearName : null,
      customStartDate: typeof customStartDate === "string" ? customStartDate : null,
      customEndDate: typeof customEndDate === "string" ? customEndDate : null,
    });

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