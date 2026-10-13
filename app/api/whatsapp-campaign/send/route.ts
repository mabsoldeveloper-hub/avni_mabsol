import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import WhatsAppCampaign from "@/models/WhatsAppCampaign";

export const runtime = "nodejs";

// Clean and normalize phone numbers (defaults to +91 for 10-digit Indian numbers)
function normalizePhoneNumber(raw: string): string {
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";

export async function POST(request: NextRequest, props: any) {
  return withAuth(async (req) => {
    try {
      await connectDB();

    const body = await req.json();
    const {
      campaignName = `WhatsApp Campaign - ${new Date().toLocaleDateString("en-IN")}`,
      recipientsRaw,
      templateName = "explore_products",
      languageCode = "en",
      messageType = "template", // "template" | "text"
      customText = "",
      delayMs = 300,
    } = body;

    if (!recipientsRaw || (typeof recipientsRaw !== "string" && !Array.isArray(recipientsRaw))) {
      return NextResponse.json(
        { success: false, error: "Recipient phone numbers are required." },
        { status: 400 }
      );
    }

    // Parse recipient phone numbers
    let rawList: string[] = [];
    if (typeof recipientsRaw === "string") {
      rawList = recipientsRaw.split(/[\n,;|\s]+/);
    } else if (Array.isArray(recipientsRaw)) {
      rawList = recipientsRaw;
    }

    const uniqueNumbers = Array.from(
      new Set(
        rawList
          .map((n) => normalizePhoneNumber(n))
          .filter((n) => n.length >= 10 && n.length <= 15)
      )
    );

    if (uniqueNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid 10-12 digit phone numbers provided." },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: "WhatsApp API credentials (WHATSAPP_TOKEN or PHONE_NUMBER_ID) missing in server configuration.",
        },
        { status: 500 }
      );
    }

    // Create DB Campaign record
    const recipientLogs = uniqueNumbers.map((phone) => ({
      phone,
      status: "pending" as const,
    }));

    const campaign = await WhatsAppCampaign.create({
      campaignName,
      templateName: messageType === "template" ? templateName : undefined,
      languageCode: messageType === "template" ? languageCode : undefined,
      headerText: "Explore Mabsol Products",
      bodyText:
        messageType === "template"
          ? "Apne business ke liye CRM, HRMS, Billing, ERP, Inventory aur anya software solutions explore karein. Apni requirement ke according custom software bhi develop karwa sakte hain."
          : customText,
      footerText: "Mabsol Infotech Pvt. Ltd.",
      buttonText: "Explore Products",
      buttonUrl: "https://demo.mabsolinfotech.com",
      recipients: recipientLogs,
      totalCount: uniqueNumbers.length,
      sentCount: 0,
      failedCount: 0,
      status: "sending",
    });

    const campaignId = campaign._id.toString();

    // Create readable stream for NDJSON live logging
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let sentCount = 0;
        let failedCount = 0;

        // Send initial event
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "init",
              campaignId,
              total: uniqueNumbers.length,
              templateName: messageType === "template" ? templateName : "Custom Text",
              timestamp: new Date().toISOString(),
            }) + "\n"
          )
        );

        for (let i = 0; i < uniqueNumbers.length; i++) {
          const phone = uniqueNumbers[i];

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "sending",
                phone,
                index: i + 1,
                total: uniqueNumbers.length,
                timestamp: new Date().toISOString(),
              }) + "\n"
            )
          );

          // Small delay for rate-limiting and smooth terminal UI
          if (delayMs > 0) {
            await new Promise((res) => setTimeout(res, Math.min(Math.max(delayMs, 100), 3000)));
          }

          let payload: Record<string, any>;

          if (messageType === "text" && customText.trim()) {
            payload = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phone,
              type: "text",
              text: {
                preview_url: true,
                body: customText,
              },
            };
          } else {
            // Default template message
            payload = {
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              template: {
                name: templateName || "explore_products",
                language: {
                  code: languageCode || "en_US",
                },
              },
            };
          }

          try {
            let apiRes = await fetch(
              `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              }
            );

            let resData = await apiRes.json();

            // Auto fallback: If template translation error (#132001), retry with alternative language code (e.g. en <-> en_US)
            if (
              !apiRes.ok &&
              messageType === "template" &&
              (resData?.error?.code === 132001 ||
                resData?.error?.message?.includes("translation"))
            ) {
              const fallbackLang =
                languageCode === "en"
                  ? "en_US"
                  : languageCode === "en_US"
                  ? "en"
                  : "en_US";

              const retryPayload = {
                ...payload,
                template: {
                  ...payload.template,
                  language: { code: fallbackLang },
                },
              };

              const retryRes = await fetch(
                `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(retryPayload),
                }
              );

              const retryData = await retryRes.json();
              if (retryRes.ok && retryData?.messages?.[0]?.id) {
                apiRes = retryRes;
                resData = retryData;
              }
            }

            const now = new Date();

            if (apiRes.ok && resData?.messages?.[0]?.id) {
              const messageId = resData.messages[0].id;
              sentCount++;

              await WhatsAppCampaign.updateOne(
                { _id: campaignId, "recipients.phone": phone },
                {
                  $set: {
                    "recipients.$.status": "sent",
                    "recipients.$.messageId": messageId,
                    "recipients.$.sentAt": now,
                  },
                  $inc: { sentCount: 1 },
                }
              );

              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "log",
                    phone,
                    status: "sent",
                    messageId,
                    sentCount,
                    failedCount,
                    progressPct: Math.round(((i + 1) / uniqueNumbers.length) * 100),
                    timestamp: now.toISOString(),
                  }) + "\n"
                )
              );
            } else {
              let errorMsg =
                resData?.error?.message ||
                resData?.error?.error_user_msg ||
                `Meta API HTTP ${apiRes.status}`;

              if (
                resData?.error?.code === 132001 ||
                errorMsg.includes("translation")
              ) {
                errorMsg = `Meta Error: Template '${templateName}' does not exist or is not approved yet in Meta Manager (Lang: ${languageCode}/en_US). Please verify approval in Meta WhatsApp Manager.`;
              }

              failedCount++;

              await WhatsAppCampaign.updateOne(
                { _id: campaignId, "recipients.phone": phone },
                {
                  $set: {
                    "recipients.$.status": "failed",
                    "recipients.$.error": errorMsg,
                  },
                  $inc: { failedCount: 1 },
                }
              );

              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "log",
                    phone,
                    status: "failed",
                    error: errorMsg,
                    sentCount,
                    failedCount,
                    progressPct: Math.round(((i + 1) / uniqueNumbers.length) * 100),
                    timestamp: now.toISOString(),
                  }) + "\n"
                )
              );
            }
          } catch (sendErr: any) {
            failedCount++;
            const errorMsg = sendErr?.message || "Network/Fetch error";

            await WhatsAppCampaign.updateOne(
              { _id: campaignId, "recipients.phone": phone },
              {
                $set: {
                  "recipients.$.status": "failed",
                  "recipients.$.error": errorMsg,
                },
                $inc: { failedCount: 1 },
              }
            );

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "log",
                  phone,
                  status: "failed",
                  error: errorMsg,
                  sentCount,
                  failedCount,
                  progressPct: Math.round(((i + 1) / uniqueNumbers.length) * 100),
                  timestamp: new Date().toISOString(),
                }) + "\n"
              )
            );
          }
        }

        // Finalize campaign in DB
        const finalStatus =
          sentCount === 0 && failedCount > 0
            ? "failed"
            : failedCount > 0
            ? "completed"
            : "completed";

        await WhatsAppCampaign.findByIdAndUpdate(campaignId, {
          status: finalStatus,
        });

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "complete",
              campaignId,
              total: uniqueNumbers.length,
              sentCount,
              failedCount,
              status: finalStatus,
              timestamp: new Date().toISOString(),
            }) + "\n"
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
    } catch (err: any) {
      console.error("WHATSAPP CAMPAIGN API ERROR:", err);
      return NextResponse.json(
        { success: false, error: err?.message || "Internal server error" },
        { status: 500 }
      );
    }
  })(request, props);
}
