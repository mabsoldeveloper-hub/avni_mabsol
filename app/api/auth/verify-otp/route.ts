import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import {
    SESSION_DURATION_JWT,
    SESSION_DURATION_SECONDS,
    getUserSessionDuration,
} from "@/lib/constants/session.constant";
import { validateUserLoginAccess, isSuperAdminUser } from "@/lib/services/superAdmin.service";

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

        const accessCheck = await validateUserLoginAccess(user);
        if (!accessCheck.allowed) {
            return NextResponse.json({
                success: false,
                message: accessCheck.message,
            }, { status: accessCheck.statusCode || 403 });
        }

        const isSuperAdmin = isSuperAdminUser(user);
        const isAgent = Boolean(body.isAgent || body.isDesktopAgent);
        const sessionTiming = getUserSessionDuration(user);

        const token = jwt.sign(
            {
                id: user._id,
                tenantId: user.tenantId,
                roleId: user.roleId,
                companyId: user.companyId,
                roleType: user.roleType,
                isSuperAdmin,
            },
            process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026",
            { expiresIn: (isAgent ? "30d" : sessionTiming.jwtExpiry) as any }
        );

        const userResponse = {
            _id: user._id,
            tenantId: user.tenantId,
            name: user.name,
            email: user.email,
            roleId: user.roleId,
            roleType: user.roleType,
            companyId: user.companyId,
            status: user.status,
            isApproved: user.isApproved,
            isSuperAdmin,
            sessionTimeoutHours: user.sessionTimeoutHours || 1,
            accessValidUntil: user.accessValidUntil,
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
            maxAge: isAgent ? 30 * 24 * 60 * 60 : sessionTiming.maxAgeSeconds,
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