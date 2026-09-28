import dbConnect from "./mongodb";
import mongoose from "mongoose";
import type { Db } from "mongodb";

export type BackupFrequency =
  | "every_minute"
  | "every_2_hours"
  | "every_6_hours"
  | "daily"
  | "weekly";

export type BackupScope = "current_fy" | "all" | "custom";

export interface BackupSettings {
  _id: string;
  receiverEmail: string;
  frequency: BackupFrequency;
  enabled: boolean;
  scope?: BackupScope;
  financialYearId?: string | null;
  financialYearName?: string | null;
  customStartDate?: string | null;
  customEndDate?: string | null;
  nextBackupAt?: Date | null;
  lastBackupAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

async function getDatabase(): Promise<Db> {
  await dbConnect();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB database connection is not available");
  }

  return db;
}

export async function getBackupSettings(): Promise<BackupSettings | null> {
  const db = await getDatabase();

  const settings = await db
    .collection<BackupSettings>("backup_settings")
    .findOne({
      _id: "main",
    });

  return settings;
}

export async function saveBackupSettings(data: {
  receiverEmail: string;
  frequency: BackupFrequency;
  enabled: boolean;
  scope?: BackupScope;
  financialYearId?: string | null;
  financialYearName?: string | null;
  customStartDate?: string | null;
  customEndDate?: string | null;
}): Promise<BackupSettings | null> {
  const db = await getDatabase();

  const nextBackupAt = data.enabled
    ? getNextBackupDate(data.frequency)
    : null;

  await db.collection<BackupSettings>("backup_settings").updateOne(
    {
      _id: "main",
    },
    {
      $set: {
        receiverEmail: data.receiverEmail,
        frequency: data.frequency,
        enabled: data.enabled,
        scope: data.scope || "current_fy",
        financialYearId: data.financialYearId || null,
        financialYearName: data.financialYearName || null,
        customStartDate: data.customStartDate || null,
        customEndDate: data.customEndDate || null,
        nextBackupAt,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
    }
  );

  return getBackupSettings();
}

export function getNextBackupDate(
  frequency: BackupFrequency,
  from = new Date()
): Date {
  const next = new Date(from);

  switch (frequency) {
    case "every_minute":
      next.setMinutes(next.getMinutes() + 1);
      break;

    case "every_2_hours":
      next.setHours(next.getHours() + 2);
      break;

    case "every_6_hours":
      next.setHours(next.getHours() + 6);
      break;

    case "daily":
      next.setDate(next.getDate() + 1);
      break;

    case "weekly":
      next.setDate(next.getDate() + 7);
      break;

    default:
      throw new Error("Invalid backup frequency");
  }

  return next;
}