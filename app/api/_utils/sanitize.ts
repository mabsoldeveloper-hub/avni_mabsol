export function escapeRegex(text: string): string {
  if (!text) return "";
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function sanitizeString(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\u0000/g, "").trim();
}

export function isAllowedImageExtension(ext: string): boolean {
  const allowed = new Set(["png", "jpg", "jpeg", "webp"]);
  return allowed.has(ext.toLowerCase().trim());
}
