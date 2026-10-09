export interface ChildBranchSummary {
  _id: string;
  companyName: string;
  companyCode: string;
  city?: string;
  state?: string;
  gstNo?: string;
  status?: string;
  email?: string;
  mobile?: string;
}

export interface ParentCompanySummary {
  _id: string;
  companyName?: string;
  companyCode?: string;
  isHeadOffice?: boolean;
  city?: string;
  state?: string;
  gstNo?: string;
}

export interface SuperAdminCompanyDetails {
  _id?: string;
  companyName?: string;
  companyCode?: string;
  tenantId?: string;
  isHeadOffice?: boolean;
  parentCompanyId?: ParentCompanySummary | null;
  branchCount?: number;
  childBranches?: ChildBranchSummary[];
  gstNo?: string;
  panNo?: string;
  drugLicenseNo?: string;
  city?: string;
  state?: string;
  address?: string;
  businessType?: string;
  status?: string;
  enabledModules?: string[];
}

export interface SuperAdminUserItem {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  designation?: string;
  employeeCode?: string;
  roleName?: string;
  roleType?: string;
  role?: string;
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
  companyId?: SuperAdminCompanyDetails | null;
}

export interface SuperAdminStats {
  total: number;
  pending: number;
  active: number;
  expired: number;
  rejected: number;
  suspended?: number;
  deactive?: number;
  headOffices?: number;
  childBranches?: number;
  totalCompanies?: number;
}

export interface FilterState {
  search: string;
  status: string; // 'all' | 'approved' | 'pending' | 'suspended' | 'expired'
  branchType: string; // 'all' | 'head_office' | 'child_branch'
  parentCompanyId: string; // 'all' | specific Head Office ID
  plan: string;
  city: string;
  date: string;
  timeRange: string;
}
