import nodemailer from "nodemailer";

interface SendBackupEmailOptions {
  receiverEmail: string;
  fileName: string;
  buffer: Buffer;
}

function getTransporter() {
  const senderEmail = process.env.SMTP_USER?.trim();
  const gmailAppPassword = process.env.SMTP_PASS?.trim();

  if (!senderEmail || !gmailAppPassword) {
    throw new Error(
      "SMTP_USER or SMTP_PASS is missing in environment variables (.env)",
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
}: SendBackupEmailOptions) {
  const { transporter, senderEmail } = getTransporter();

  await transporter.sendMail({
    from: `"Database Backup" <${senderEmail}>`,
    to: receiverEmail,
    subject: "Encrypted Database Backup",
    text: "Your encrypted database backup is attached with this email.",
    attachments: [
      {
        filename: fileName,
        content: buffer,
        contentType: "application/octet-stream",
      },
    ],
  });
}