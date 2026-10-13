import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";
import { sendCampaignEmail, MailAttachment } from "@/lib/mail";

import { NextRequest } from "next/server";
import { withAuth } from "@/app/api/_middlewares/auth.middleware";

export const runtime = "nodejs";

export async function POST(request: NextRequest, props: any) {
  return withAuth(async (req) => {
    try {
      await connectDB();

      const formData = await req.formData();
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;
    const recipientsRaw = formData.get("recipients") as string;

    if (!subject || !message || !recipientsRaw) {
      return NextResponse.json(
        { success: false, error: "Subject, message body, and recipients are required." },
        { status: 400 }
      );
    }

    // Parse recipient email addresses (comma, newline, or semicolon separated)
    const recipientEmails = Array.from(
      new Set(
        recipientsRaw
          .split(/[\n,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0 && e.includes("@"))
      )
    );

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid email addresses provided." },
        { status: 400 }
      );
    }

    // Extract attachments from formData
    const attachmentFiles = formData.getAll("attachments") as File[];
    const processedAttachments: MailAttachment[] = [];
    const attachmentMeta: { filename: string; size: number; mimeType: string }[] = [];

    for (const file of attachmentFiles) {
      if (file && file.size > 0 && file.name) {
        const buffer = Buffer.from(await file.arrayBuffer());
        processedAttachments.push({
          filename: file.name,
          content: buffer,
          contentType: file.type || "application/octet-stream",
        });
        attachmentMeta.push({
          filename: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
        });
      }
    }

    // Create DB Campaign record
    const recipientLogs = recipientEmails.map((email) => ({
      email,
      status: "pending" as const,
    }));

    const campaign = await EmailCampaign.create({
      subject,
      message,
      recipients: recipientLogs,
      attachments: attachmentMeta,
      totalCount: recipientEmails.length,
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
              total: recipientEmails.length,
              timestamp: new Date().toISOString(),
            }) + "\n"
          )
        );

        for (let i = 0; i < recipientEmails.length; i++) {
          const email = recipientEmails[i];
          
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "sending",
                email,
                index: i + 1,
                total: recipientEmails.length,
                timestamp: new Date().toISOString(),
              }) + "\n"
            )
          );

          // Small artificial delay for visual log tracking if batching fast
          await new Promise((res) => setTimeout(res, 250));

          const res = await sendCampaignEmail({
            to: email,
            subject,
            html: message,
            attachments: processedAttachments,
          });

          const now = new Date();

          if (res.success) {
            sentCount++;
            await EmailCampaign.updateOne(
              { _id: campaignId, "recipients.email": email },
              {
                $set: {
                  "recipients.$.status": "sent",
                  "recipients.$.sentAt": now,
                },
                $inc: { sentCount: 1 },
              }
            );

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "log",
                  email,
                  status: "sent",
                  messageId: res.messageId || "Delivered",
                  sentCount,
                  failedCount,
                  progressPct: Math.round(((i + 1) / recipientEmails.length) * 100),
                  timestamp: now.toISOString(),
                }) + "\n"
              )
            );
          } else {
            failedCount++;
            await EmailCampaign.updateOne(
              { _id: campaignId, "recipients.email": email },
              {
                $set: {
                  "recipients.$.status": "failed",
                  "recipients.$.error": res.error || "Sending failed",
                },
                $inc: { failedCount: 1 },
              }
            );

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "log",
                  email,
                  status: "failed",
                  error: res.error || "Delivery failure",
                  sentCount,
                  failedCount,
                  progressPct: Math.round(((i + 1) / recipientEmails.length) * 100),
                  timestamp: now.toISOString(),
                }) + "\n"
              )
            );
          }
        }

        // Finalize campaign in DB
        const finalStatus = failedCount === recipientEmails.length ? "failed" : "completed";
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          status: finalStatus,
        });

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "complete",
              campaignId,
              total: recipientEmails.length,
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
      console.error("EMAIL CAMPAIGN API ERROR:", err);
      return NextResponse.json(
        { success: false, error: err?.message || "Internal server error" },
        { status: 500 }
      );
    }
  })(request, props);
}
