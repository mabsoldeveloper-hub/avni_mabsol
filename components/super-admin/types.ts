export interface SuperAdminUserItem {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  designation?: string;
  employeeCode?: string;
  roleName?: string;
  roleType?: string;
  status: string;
  isApproved: boolean;
  approvedAt?: string | null;
  approvedBy?: { name?: string; email?: string } | null;
  accessDurationDays?: number;
  accessValidUntil?: string | null;
  isUnlimitedAccess?: boolean;
  sessionTimeoutHours?: number;
  approvalNotes?: string;
  createdAt: string;
  companyId?: {
    companyName?: string;
    gstNo?: string;
    city?: string;
    state?: string;
    address?: string;
    businessType?: string;
  } | null;
}

export interface SuperAdminStats {
  total: number;
  pending: number;
  active: number;
  expired: number;
  rejected: number;
  suspended?: number;
  deactive?: number;
}

export interface FilterState {
  search: string;
  status: string;
  plan: string;
  city: string;
  date: string;
  timeRange: string;
}
