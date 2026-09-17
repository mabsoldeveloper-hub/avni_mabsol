export interface GstApiResponse {
  businessName?: string;
  tradeName?: string;
  legalName?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  stateCode?: string;
  valid?: boolean;
  raw?: any;
}

export function extractPanFromGstin(gstin: string): string {
  if (!gstin) return "";
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 12) {
    return clean.slice(2, 12);
  }
  return "";
}

export function extractStateCodeFromGstin(gstin: string): string {
  if (!gstin) return "";
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 2) {
    return clean.slice(0, 2);
  }
  return "";
}

export function getStateNameFromCode(stateCode: string): string {
  return (stateCode || "").trim();
}

/**
 * Fetch all details directly using mygstcafe Common API v1.1
 */
export async function verifyGST(gstin: string) {
  const apiUrl = `https://gstapi.mygstcafe.com/managed/commonapi/v1.1/search?gstin=${gstin}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    customerId: process.env.GST_CLIENT_ID || '',
    apiId: process.env.GST_API_ID || '',
    apiSecret: process.env.GST_CLIENT_SECRET || '',
    'environment-type': process.env.ENVIRONMENT_TYPE || 'Production',
    appKey: process.env.GST_APP_KEY || '',
    accept: 'application/json',
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    const data = (await response.json()) as any;
    // console.log('GST API Raw Response:', data);
    if (data.status_cd === '1' && data.data) {
      const gst = data.data;
      const addressParts = gst.pradr?.addr;
      const stateName = gst.pradr?.addr?.state || gst.pradr?.addr?.stcd || gst.stj || '';
      const fullAddress = `${addressParts?.bno || ''}, ${addressParts?.st || ''}, ${addressParts?.loc || ''}, ${addressParts?.dst || ''}, ${stateName}`;
      return {
        businessName: gst.lgnm,
        tradeName: gst.tradeNam,
        legalName: gst.lgnm,
        address: fullAddress.trim().replace(/,\s*,/g, ', ').replace(/^,\s*/, ''),
        state: stateName,
        city: gst.pradr?.addr?.dst || gst.pradr?.addr?.city || '',
        pincode: gst.pradr?.addr?.pncd || '',
        gstin,
        pan: extractPanFromGstin(gstin),
        stateCode: extractStateCodeFromGstin(gstin),
        raw: gst,
      };
    } else {
      console.error('GST API Error:', data);
      throw new Error(data?.message || data?.error_msg || 'Invalid GSTIN or Data Missing');
    }
  } catch (error: any) {
    console.error('GST API Error:', error.message);
    throw new Error(error.message || 'GST Verification Failed');
  }
}

/**
 * Backward-compatible alias
 */
export const verifyGstWithApi = verifyGST;

/**
 * Auto-lookup city & state for postal PIN code
 */
export async function lookupPostalPincode(pincode: string): Promise<{
  success: boolean;
  city?: string;
  state?: string;
}> {
  const cleanPin = String(pincode || "").trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return { success: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        return {
          success: true,
          city: po.District || po.Name || "",
          state: po.State || "",
        };
      }
    }
  } catch {
    // Timeout or network error
  }

  return { success: false };
}
