
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import connectDB from "@/lib/mongodb";

import User from "@/models/User";

import "@/models/Role";
import "@/models/CompanyMaster";

export async function verifyToken() {

  const cookieStore =
    await cookies();

  const token =
    cookieStore
      .get("token")
      ?.value;

  if (!token)
    return null;

  try {

    return jwt.verify(
      token,
      process.env.JWT_SECRET || "mabsol_super_secret_jwt_key_2026"
    );

  } catch {

    return null;

  }

}

export async function getCurrentUser() {

  await connectDB();

  const payload =
    await verifyToken();

  if (!payload)
    return null;

  const user =
    await User.findById(
      (payload as any).id
    )

      .populate(
        "companyId",
        "companyName logo"
      )

      .populate(
        "roleId",
        "roleName"
      );

  return user;

}