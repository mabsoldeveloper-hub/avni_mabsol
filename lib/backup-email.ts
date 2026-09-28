import nodemailer from "nodemailer";

interface SendBackupEmailOptions {
  receiverEmail: string;
  fileName: string;
  buffer: Buffer;
  fyName?: string;
  subject?: string;
  description?: string;
}

function getTransporter() {
  const senderEmail = process.env.SMTP_USER?.trim();
  const gmailAppPassword = process.env.SMTP_PASS?.trim();

  if (!senderEmail || !gmailAppPassword) {
    throw new Error(
      "SMTP_USER or SMTP_PASS is missing in environment variables (.env)"
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.BACKUP_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.BACKUP_SMTP_SECURE !== "false",
    auth: {
      user: senderEmail,
      pass: gmailAppPassword,
    },
  });

  return { transporter, senderEmail };
}

export async function sendBackupEmail({
  receiverEmail,
  fileName,
  buffer,
  fyName,
  subject,
  description,
}: SendBackupEmailOptions) {
  const { transporter, senderEmail } = getTransporter();

  const yearLabel = fyName ? (fyName === "ALL" ? "Full Database" : `FY ${fyName}`) : "";
  const emailSubject =
    subject ||
    (yearLabel
      ? `Encrypted Database Backup (${yearLabel})`
      : "Encrypted Database Backup");

  const emailText =
    description ||
    `Your encrypted database backup${yearLabel ? ` for ${yearLabel}` : ""} is attached with this email.\n\nFile Name: ${fileName}\nGenerated At: ${new Date().toLocaleString()}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background: #ffffff;">
      <div style="background: #2563eb; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">📦 Database Backup</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Secure Automated CRM Database Snapshot</p>
      </div>

      <div style="padding: 20px 10px; color: #334155; line-height: 1.6;">
        <p>Hello,</p>
        <p>Your scheduled encrypted database backup has been generated successfully.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Scope / Financial Year:</td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${yearLabel || "Full Database"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">File Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace;">${fileName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Encryption:</td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #16a34a; font-weight: bold;">AES-256-GCM (Encrypted)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Timestamp:</td>
            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center;">
          This is an automated security backup sent by Mabsol CRM. To restore, upload the attached file in the Admin Backup & Restore dashboard.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Database Backup" <${senderEmail}>`,
    to: receiverEmail,
    subject: emailSubject,
    text: emailText,
    html: htmlBody,
    attachments: [
      {
        filename: fileName,
        content: buffer,
        contentType: "application/octet-stream",
      },
    ],
  });
}