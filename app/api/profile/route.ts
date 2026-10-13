import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import connectDB from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import User from "@/models/User";
import "@/models/Role";
import "@/models/CompanyMaster";

export async function GET() {

  try {

    await connectDB();

    const user = await getCurrentUser();

    if (!user) {

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );

    }

    return NextResponse.json({

      success: true,

      user,

    });

  } catch (error: any) {

    return NextResponse.json(

      {

        success: false,

        error: error.message,

      },

      {

        status: 500,

      }

    );

  }

}

export async function PUT(
  req: NextRequest
) {

  try {

    await connectDB();

    const currentUser =
      await getCurrentUser();

    if (!currentUser) {

      return NextResponse.json(

        {

          success: false,

          message: "Unauthorized",

        },

        {

          status: 401,

        }

      );

    }

    const body =
      await req.json();

    const {

      name,

      mobile,

      department,

      designation,

      gender,

      dob,

      address,

      city,

      state,

      country,

      pincode,

      profilePhoto,

      currentPassword,

      newPassword,

    } = body;

    const updateData: any = {

      name,

      mobile,

      department,

      designation,

      gender,

      dob,

      address,

      city,

      state,

      country,

      pincode,

      profilePhoto,

    };

    // Password Change

    if (
      currentPassword &&
      newPassword
    ) {

      const match =
        await bcrypt.compare(

          currentPassword,

          (await User.findById(currentUser._id).select("+password"))?.password || ""

        );

      if (!match) {

        return NextResponse.json(

          {

            success: false,

            message:
              "Current Password is incorrect",

          },

          {

            status: 400,

          }

        );

      }

      updateData.password =
        await bcrypt.hash(
          newPassword,
          10
        );

    }

    await User.findByIdAndUpdate(

      currentUser._id,

      updateData

    );

    return NextResponse.json({

      success: true,

      message:
        "Profile Updated Successfully",

    });

  } catch (error: any) {

    return NextResponse.json(

      {

        success: false,

        error: error.message,

      },

      {

        status: 500,

      }

    );

  }

}