import nodemailer from "nodemailer";

// Requires these env vars in .env.local:
// SMTP_HOST=smtp.your-provider.com
// SMTP_PORT=587
// SMTP_USER=your-smtp-username
// SMTP_PASS=your-smtp-password
// EMAIL_FROM="MabsolCrm <no-reply@yourdomain.com>"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER || "support@mabsolinfotech.com",
    pass: process.env.SMTP_PASS || "Mabinfo@5181",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Brand colors — kept in sync with login.css (:root variables)
const NAVY = "#343872";
const NAVY_DARK = "#12153A";
const ORANGE = "#fb8c00";
const SURFACE = "#F7F7FD";
const MUTED = "#6668A0";
const BORDER = "#ECEEF9";

export async function sendOtpEmail(email: string, otp: string) {
  const digits = otp.split("");
  const senderEmail = process.env.SMTP_USER || "support@mabsolinfotech.com";
  const from = `"MabsolCrm" <${senderEmail}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: `${otp} is your MabsolCrm login verification code`,
      text: `Your MabsolCrm login verification code is ${otp}. This code expires in 5 minutes. If you did not request this, please ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mabsol CRM Verification Code</title>
  </head>
  <body style="margin:0; padding:0; background:${SURFACE}; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid ${BORDER}; box-shadow:0 4px 20px rgba(0,0,0,0.05);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(160deg, ${NAVY_DARK}, ${NAVY}); padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle; padding-right:10px;">
                      <div style="width:22px; height:22px; background:${ORANGE}; border-radius:6px;"></div>
                    </td>
                    <td style="vertical-align:middle; color:#ffffff; font-size:16px; font-weight:700; letter-spacing:-0.01em;">
                      MabsolCrm
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px 28px;">
                <h2 style="margin:0 0 8px; color:${NAVY}; font-size:20px; font-weight:700;">
                  Login Verification Code
                </h2>
                <p style="margin:0 0 24px; color:${MUTED}; font-size:14px; line-height:1.6;">
                  Use the 6-digit verification code below to sign in to your MabsolCrm account:
                </p>

                <!-- OTP Display -->
                <div style="text-align:center; margin:24px 0;">
                  <div style="display:inline-block; background:${SURFACE}; border:2px solid ${BORDER}; border-radius:12px; padding:12px 24px;">
                    <span style="font-family:Consolas, 'Courier New', monospace; font-size:32px; font-weight:700; color:${NAVY}; letter-spacing:6px;">${otp}</span>
                  </div>
                </div>

                <p style="margin:16px 0 0; color:${MUTED}; font-size:13px; text-align:center;">
                  This code expires in <strong>5 minutes</strong>.
                </p>

                <hr style="border:none; border-top:1px solid ${BORDER}; margin:24px 0 16px;" />

                <p style="margin:0; color:#888aa8; font-size:12px; line-height:1.5;">
                  If you didn't attempt to log in to MabsolCrm, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 28px 24px; background:#fafaff; border-top:1px solid ${BORDER};">
                <p style="margin:0; color:#A6A8D2; font-size:11.5px; text-align:center;">
                  © ${new Date().getFullYear()} MabsolCrm. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `,
    });

    console.log(`[sendOtpEmail] SUCCESS -> ${email} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[sendOtpEmail] FAILED -> ${email} | Error:`, err?.message || err);
    throw err;
  }
}