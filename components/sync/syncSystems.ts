import {
  Database,
  Layers,
  Server,
  Cpu,
  HardDrive,
  FileSpreadsheet,
  LucideIcon,
} from "lucide-react";

export interface SyncSystemConfig {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  desc: string;
  folderLabel: string;
  format: string;
  defaultPathHint: string;
  isComingSoon?: boolean;
}

export const SYNC_SYSTEMS: SyncSystemConfig[] = [
  {
    id: "mabsolcrm",
    name: "Sync MabsolCRM",
    shortName: "MabsolCRM",
    badge: "Data Sync",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    badgeBorder: "border-slate-200",
    icon: Database,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    desc: "MabsolCRM native database and data tables sync with background worker",
    folderLabel: "MabsolCRM Folder",
    format: "CRM Data Tables (DBF / Data Store)",
    defaultPathHint: "e.g. D:\\MabsolCRM\\DATA",
    isComingSoon: false,
  },
  {
    id: "busy",
    name: "Sync Busy ERP",
    shortName: "Busy ERP",
    badge: "Coming Soon",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    icon: Server,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    desc: "Direct MS Access & SQL database synchronization for Busy 18 / 21",
    folderLabel: "Busy ERP Data Directory",
    format: "MDB / MDF / SQL Server",
    defaultPathHint: "e.g. C:\\BusyWin\\Data",
    isComingSoon: true,
  },
  {
    id: "tally",
    name: "Sync Tally ERP",
    shortName: "Tally ERP",
    badge: "Coming Soon",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    icon: Layers,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    desc: "Tally Prime & ERP 9 XML Gateway / ODBC connector",
    folderLabel: "Tally Data / XML Gateway",
    format: "XML Gateway (Port 9000) / ODBC",
    defaultPathHint: "e.g. http://localhost:9000",
    isComingSoon: true,
  },
  {
    id: "marg",
    name: "Sync Marg ERP",
    shortName: "Marg ERP",
    badge: "Coming Soon",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    icon: FileSpreadsheet,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    desc: "Marg ERP 9+ accounting & pharmaceutical inventory synchronization",
    folderLabel: "Marg ERP Directory",
    format: "Marg Data Store & XML",
    defaultPathHint: "e.g. C:\\MargWin\\Data",
    isComingSoon: true,
  },
  {
    id: "easysol",
    name: "Sync EasySol",
    shortName: "EasySol",
    badge: "Coming Soon",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    icon: Cpu,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    desc: "Pharma distribution & retail inventory database synchronization",
    folderLabel: "EasySol Data Directory",
    format: "EasySol Master & Transaction DB",
    defaultPathHint: "e.g. C:\\EasySol\\DATA",
    isComingSoon: true,
  },
  {
    id: "logic",
    name: "Sync Logic ERP",
    shortName: "Logic ERP",
    badge: "Coming Soon",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
    icon: HardDrive,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-100",
    desc: "Logic ERP wholesale and retail enterprise SQL sync pipeline",
    folderLabel: "Logic ERP SQL Database",
    format: "Logic Enterprise SQL Server",
    defaultPathHint: "e.g. LogicERP Server / Database",
    isComingSoon: true,
  },
];

export function getSyncSystem(id?: string): SyncSystemConfig {
  if (!id) return SYNC_SYSTEMS[0];
  return SYNC_SYSTEMS.find((s) => s.id === id) || SYNC_SYSTEMS[0];
}
