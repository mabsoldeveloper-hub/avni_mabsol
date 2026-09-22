import { NextResponse } from "next/server";

import {
  getBackupSettings,
  saveBackupSettings,
  type BackupFrequency,
} from "@/lib/backup-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    // IMPORTANT:
    // Yahan admin authentication check lagana hai.

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
    console.error(
      "Get backup settings error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to get backup settings",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // IMPORTANT:
    // Yahan admin authentication check lagana hai.

    const body = await request.json();

    const {
      receiverEmail,
      frequency,
      enabled,
    } = body as {
      receiverEmail?: unknown;
      frequency?: unknown;
      enabled?: unknown;
    };

    if (
      typeof receiverEmail !== "string" ||
      !receiverEmail.trim() ||
      typeof frequency !== "string"
    ) {
      return NextResponse.json(
        {
          message:
            "Receiver and frequency are required",
        },
        { status: 400 },
      );
    }

    const validFrequencies: BackupFrequency[] = [
      "every_minute",
      "every_2_hours",
      "every_6_hours",
      "daily",
      "weekly",
    ];

    if (
      !validFrequencies.includes(
        frequency as BackupFrequency,
      )
    ) {
      return NextResponse.json(
        {
          message: "Invalid frequency",
        },
        { status: 400 },
      );
    }

    if (
      enabled !== undefined &&
      typeof enabled !== "boolean"
    ) {
      return NextResponse.json(
        {
          message: "Enabled must be a boolean",
        },
        { status: 400 },
      );
    }

    const settings = await saveBackupSettings({
      receiverEmail: receiverEmail.trim(),
      frequency: frequency as BackupFrequency,
      enabled: enabled ?? true,
    });

    return NextResponse.json({
      message: "Backup settings saved",
      settings,
    });
  } catch (error) {
    console.error(
      "Save backup settings error:",
      error,
    );

    return NextResponse.json(
      {
        message: "Failed to save backup settings",
      },
      { status: 500 },
    );
  }
}