import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { SESSION_DURATION_JWT, SESSION_DURATION_SECONDS } from "@/lib/constants/session.constant";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
    try {
        await connectDB();

        const body = await req.json();
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json({
                success: false,
                message: "Email and code are required",
            });
        }

        const otpDoc = await Otp.findOne({ email }).sort({ createdAt: -1 });

        if (!otpDoc) {
            return NextResponse.json({
                success: false,
                message: "Code expired or not found. Please request a new one.",
            });
        }

        if (otpDoc.attempts >= MAX_ATTEMPTS) {
            await Otp.deleteMany({ email });
            return NextResponse.json({
                success: false,
                message: "Too many incorrect attempts. Please request a new code.",
            });
        }

        const isMatch = await bcrypt.compare(otp, otpDoc.otp);

        if (!isMatch) {
                otpDoc.attempts += 1;
                await otpDoc.save();
            return NextResponse.json({
                success: false,
                message: "Incorrect code. Please try again.",
            });
        }

        // OTP correct — consume it so it can't be reused
        if (otpDoc) {
            await Otp.deleteMany({ email });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: "User not found",
            });
        }

        const isAgent = Boolean(body.isAgent || body.isDesktopAgent);
        const token = jwt.sign(
            {
                id: user._id,
                tenantId: user.tenantId,
                roleId: user.roleId,
                companyId: user.companyId,
            },
            process.env.JWT_SECRET!,
            { expiresIn: isAgent ? "30d" : SESSION_DURATION_JWT }
        );

        const userResponse = {
            _id: user._id,
            tenantId: user.tenantId,
            name: user.name,
            email: user.email,
            roleId: user.roleId,
            companyId: user.companyId,
            status: user.status,
        };

        const response = NextResponse.json({
            success: true,
            user: userResponse,
            token,
        });

        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        });

        return response;
    } catch (error: unknown) {
        console.error("VERIFY OTP ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Verification failed",
            },
            { status: 500 }
        );
    }
}