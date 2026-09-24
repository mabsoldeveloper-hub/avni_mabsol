/**
 * Common validation constants and regex patterns for MabsolCrm
 */

// ── Regex Patterns ──────────────────────────────────────
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_REGEX = /^[6-9][0-9]{9}$/; // Indian 10-digit mobile
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
// Only letters, spaces, dots, hyphens — no digits
export const NAME_REGEX = /^[a-zA-Z\s.\-']{2,80}$/;
// Company name — alphanumeric, space, dot, dash, ampersand, parentheses
export const COMPANY_NAME_REGEX = /^[a-zA-Z0-9\s.\-&(),]{2,120}$/;
// Alphanumeric company code
export const COMPANY_CODE_REGEX = /^[A-Z0-9]{3,12}$/;

// ── Field Length Limits ──────────────────────────────────
export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  COMPANY_NAME_MIN: 2,
  COMPANY_NAME_MAX: 120,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 50,
  ADDRESS_MAX: 250,
  OTP_LENGTH: 6,
  DRUG_LICENSE_MAX: 30,
} as const;

// ── Validation Helpers ────────────────────────────────────
export function validateEmail(email: string): string | null {
  if (!email?.trim()) return "Email address is required";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address (e.g. name@company.com)";
  return null;
}

export function validateMobile(mobile: string): string | null {
  const digits = mobile?.replace(/\D/g, "") || "";
  if (!digits) return "Mobile number is required";
  if (digits.length !== 10) return "Mobile number must be exactly 10 digits";
  if (!MOBILE_REGEX.test(digits)) return "Enter a valid Indian mobile number (starts with 6–9)";
  return null;
}

export function validateName(name: string): string | null {
  if (!name?.trim()) return "Full name is required";
  if (name.trim().length < LIMITS.NAME_MIN) return `Name must be at least ${LIMITS.NAME_MIN} characters`;
  if (name.trim().length > LIMITS.NAME_MAX) return `Name must be at most ${LIMITS.NAME_MAX} characters`;
  if (/\d/.test(name)) return "Name must not contain numbers";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < LIMITS.PASSWORD_MIN) return `Password must be at least ${LIMITS.PASSWORD_MIN} characters`;
  if (password.length > LIMITS.PASSWORD_MAX) return `Password too long (max ${LIMITS.PASSWORD_MAX} chars)`;
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

export function validateGstin(gstin: string): string | null {
  if (!gstin?.trim()) return "GSTIN is required";
  if (gstin.trim().length !== 15) return "GSTIN must be exactly 15 characters";
  if (!GSTIN_REGEX.test(gstin.trim())) return "Invalid GSTIN format (e.g. 06AALCM8009M1Z1)";
  return null;
}

export function validateCompanyName(name: string): string | null {
  if (!name?.trim()) return "Company name is required";
  if (name.trim().length < LIMITS.COMPANY_NAME_MIN) return `Company name too short (min ${LIMITS.COMPANY_NAME_MIN} chars)`;
  if (name.trim().length > LIMITS.COMPANY_NAME_MAX) return `Company name too long (max ${LIMITS.COMPANY_NAME_MAX} chars)`;
  return null;
}
