import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";
import { sendWhatsAppOTP } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Send WhatsApp OTP helper wrapper ───────────────────────────────────────
async function triggerWhatsAppOTP(phone: string, otp: string): Promise<void> {
  await sendWhatsAppOTP(phone, otp);
}

// ─── Send Email OTP via SMTP ──────────────────────────────────────────────────
async function sendEmailOTP(email: string, otp: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
        <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">🔐 Email Verification</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Mabsol CRM – Lead Verification</p>
      </div>
      <div style="padding: 36px 40px; text-align: center;">
        <p style="color: #475569; font-size: 15px; margin: 0 0 24px;">Use the OTP below to verify your email address</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 0 auto 24px; display: inline-block; min-width: 200px;">
          <span style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #6366f1; font-family: 'Courier New', monospace;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">⏱ Valid for <strong>10 minutes</strong>. Do not share this OTP.</p>
      </div>
      <div style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #cbd5e1; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Mabsol Infotech Pvt. Ltd.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Mabsol CRM <support@mabsolinfotech.com>",
    to: email,
    subject: `${otp} - Your OTP for Mabsol CRM Lead Verification`,
    html,
  });
}

// ─── POST /api/leads/send-otp ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { type, value } = body; // type: "whatsapp" | "email", value: phone or email

    if (!type || !value) {
      return NextResponse.json({ error: "type and value are required" }, { status: 400 });
    }
    if (!["whatsapp", "email"].includes(type)) {
      return NextResponse.json({ error: "type must be 'whatsapp' or 'email'" }, { status: 400 });
    }

    const otp = generateOTP();
    const targetType = type === "whatsapp" ? "mobile" : "email";
    const cleanVal = String(value).trim().toLowerCase();
    const filter = targetType === "email" ? { email: cleanVal, type: "email" } : { mobile: cleanVal, type: "mobile" };

    // Persist to MongoDB with TTL
    await Otp.findOneAndUpdate(
      filter,
      {
        ...(targetType === "email" ? { email: cleanVal } : { mobile: cleanVal }),
        type: targetType,
        otp,
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    // Send OTP
    if (type === "whatsapp") {
      await triggerWhatsAppOTP(value, otp);
    } else {
      await sendEmailOTP(value, otp);
    }

    return NextResponse.json({
      success: true,
      message: type === "whatsapp"
        ? "OTP sent via WhatsApp successfully"
        : "OTP sent to email successfully",
    });
  } catch (error: any) {
    console.error("[SEND OTP]", error);
    return NextResponse.json(
      { error: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
