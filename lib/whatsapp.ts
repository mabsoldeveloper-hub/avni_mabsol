/**
 * lib/whatsapp.ts
 * Meta WhatsApp Cloud API helper for OTP verification
 */

export async function sendWhatsAppOTP(
  mobile: string,
  otp: string
): Promise<{ success: boolean; provider?: string; error?: string; data?: any }> {
  // Clean and normalize mobile number (e.g. 9876543210 -> 919876543210)
  let rawDigits = String(mobile || "").replace(/\D/g, "");
  if (rawDigits.startsWith("0") && rawDigits.length === 11) {
    rawDigits = rawDigits.slice(1);
  }
  if (rawDigits.length === 10) {
    rawDigits = "91" + rawDigits;
  }
  const formattedWithPlus = rawDigits.startsWith("+") ? rawDigits : `+${rawDigits}`;

  // Log verification code prominently in terminal for development & testing
  console.log(`\n======================================================`);
  console.log(`[WHATSAPP OTP] To: ${formattedWithPlus} | OTP: ${otp}`);
  console.log(`======================================================\n`);

  const phoneNumberId =
    process.env.PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.META_PHONE_NUMBER_ID ||
    "";
  const whatsappToken = (process.env.WHATSAPP_TOKEN || "").trim();

  if (phoneNumberId && whatsappToken) {
    try {
      const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "crm_verification";

      // 1. Try sending template message
      const templatePayload = {
        messaging_product: "whatsapp",
        to: rawDigits,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      let response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      let data = await response.json();

      if (response.ok && data?.messages?.[0]?.id) {
        console.log("[Meta WhatsApp] OTP Sent successfully via Template:", data.messages[0].id);
        return { success: true, provider: "meta_template", data };
      }

      // 2. If template message fails, retry with direct text message
      console.warn("[Meta WhatsApp] Template failed, retrying with direct text payload...", data?.error?.message);

      const textPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: rawDigits,
        type: "text",
        text: {
          preview_url: false,
          body: `Your MabsolCrm verification code is: *${otp}*. Valid for 10 minutes. Please do not share this code.`,
        },
      };

      const textRes = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(textPayload),
        }
      );
      const textData = await textRes.json();

      if (textRes.ok && textData?.messages?.[0]?.id) {
        console.log("[Meta WhatsApp] OTP Sent successfully via Direct Text:", textData.messages[0].id);
        return { success: true, provider: "meta_text", data: textData };
      }

      console.warn("[Meta WhatsApp] Direct text returned error:", textData?.error?.message);
      return { success: true, provider: "local_log", error: textData?.error?.message };
    } catch (metaErr: any) {
      console.warn("[Meta WhatsApp Error]:", metaErr?.message || metaErr);
      return { success: true, provider: "local_log", error: metaErr?.message };
    }
  } else {
    console.warn(
      "[Meta WhatsApp] Missing PHONE_NUMBER_ID in .env. To enable Meta Cloud WhatsApp, set PHONE_NUMBER_ID=<your_meta_phone_number_id> in .env."
    );
  }

  return {
    success: true,
    provider: "local_log",
  };
}