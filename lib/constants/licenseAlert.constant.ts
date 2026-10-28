/**
 * Master List of Administrator & Security Notification Emails
 * 
 * Used for:
 * - Desktop Sync Agent License Verification & Device Authorization OTPs
 * - Settings Unlock Security Verification OTPs
 * 
 * To change, add, or remove verification emails, update this array.
 * You can also optionally override/append via the LICENSE_OTP_RECIPIENT_EMAILS environment variable (comma-separated).
 */
export const LICENSE_VERIFICATION_RECIPIENT_EMAILS: string[] = [
  "mabsoldeveloper@gmail.com",
  "rahulavashist@gmail.com",
  "mabsolinfotechpvtltd@gmail.com",
  "mabsolinfotech@gmail.com",
];

/**
 * Helper to get the complete, deduplicated list of recipient emails
 * including any user-provided account email and environment variable overrides.
 */
export function getLicenseOtpRecipientEmails(additionalEmail?: string): string[] {
  const envEmails = process.env.LICENSE_OTP_RECIPIENT_EMAILS
    ? process.env.LICENSE_OTP_RECIPIENT_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];

  const combined = [
    ...(additionalEmail ? [additionalEmail.trim().toLowerCase()] : []),
    ...LICENSE_VERIFICATION_RECIPIENT_EMAILS.map((e) => e.trim().toLowerCase()),
    ...envEmails,
  ];

  return Array.from(new Set(combined.filter((e) => Boolean(e) && e.includes("@"))));
}

/**
 * Helper to check if a provided email is in the authorized admin/recipient list.
 */
export function isAuthorizedLicenseEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const all = getLicenseOtpRecipientEmails();
  return all.includes(clean);
}
