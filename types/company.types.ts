/**
 * Shared TypeScript interfaces for MabsolCrm
 */

// ── Auth Types ──────────────────────────────────────────
export interface ICurrentUser {
  _id: string;
  tenantId: string;
  companyId: string | { _id: string; companyName: string; logo?: string };
  roleId?: string | { _id: string; roleName: string };
  name: string;
  email: string;
  mobile: string;
  role: string;
  roleType: string;
  designation?: string;
  status: string;
}

export interface IOtpVerifyPayload {
  identifier: string;  // email or mobile
  type: "email" | "mobile";
  otp: string;
}

export interface IRegistrationPayload {
  name: string;
  email: string;
  mobile: string;
  password: string;
  designation?: string;
  companyName: string;
  gstNo?: string;
  panNo?: string;
  drugLicenseNo?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  additionalGstins?: IAdditionalGstin[];
  businessType?: string;
  financialYearName?: string;
}

// ── Company Types ───────────────────────────────────────
export interface IAdditionalGstin {
  gstNo: string;
  state: string;
  stateCode: string;
  verified: boolean;
  address?: string;
  city?: string;
  pincode?: string;
}

export interface ICompany {
  _id: string;
  tenantId: string;
  companyCode: string;
  companyName: string;
  ownerName?: string;
  email?: string;
  mobile?: string;
  gstNo?: string;
  panNo?: string;
  drugLicenseNo?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: string;
  additionalGstins?: IAdditionalGstin[];
}

export interface ICompanyListItem {
  _id: string;
  companyCode?: string;
  companyName?: string;
  ownerName?: string;
  email?: string;
  mobile?: string;
  gstNo?: string;
  city?: string;
  state?: string;
  status?: string;
}
