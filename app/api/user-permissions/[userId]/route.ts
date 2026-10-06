// // import { NextRequest, NextResponse } from "next/server";

// // import connectDB from "@/lib/mongodb";

// // import UserPermission from "@/models/UserPermission";

// // interface Props {
// //   params: Promise<{
// //     userId: string;
// //   }>;
// // }

// // export async function GET(
// //   req: NextRequest,
// //   { params }: Props
// // ) {

// //   try {

// //     await connectDB();

// //     const { userId } =
// //       await params;

// //     const permissions =
// //       await UserPermission.find({
// //         userId,
// //       });

// //     return NextResponse.json(
// //       permissions
// //     );

// //   } catch (error: any) {

// //     return NextResponse.json(
// //       {
// //         success: false,
// //         error: error.message,
// //       },
// //       {
// //         status: 500,
// //       }
// //     );

// //   }

// // }



// import { NextRequest, NextResponse } from "next/server";
// import connectDB from "@/lib/mongodb";
// import UserPermission from "@/models/UserPermission";

// export const dynamic = "force-dynamic";

// export async function POST(req: NextRequest) {
//   try {
//     await connectDB();

//     const body = await req.json();

//     const userId = body?.userId;

//     if (!userId) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "userId is required",
//         },
//         { status: 400 }
//       );
//     }

//     const permissions = Array.isArray(body?.permissions)
//       ? body.permissions
//       : [];

//     // Remove old permissions for this user.
//     await UserPermission.deleteMany({
//       userId,
//     });

//     /*
//      * Save the complete permission state.
//      *
//      * Important:
//      * allow:true  = explicitly allowed
//      * allow:false = explicitly denied
//      *
//      * The frontend must send both checked and unchecked
//      * permissions.
//      */
//     if (permissions.length > 0) {
//       const normalizedPermissions = permissions
//         .filter((item: any) => item?.permissionId)
//         .map((item: any) => ({
//           userId,
//           permissionId: item.permissionId,
//           allow: item.allow === true,
//         }));

//       if (normalizedPermissions.length > 0) {
//         await UserPermission.insertMany(normalizedPermissions);
//       }
//     }

//     return NextResponse.json({
//       success: true,
//       message: "User permissions saved successfully",
//     });
//   } catch (error: any) {
//     console.error("USER PERMISSION SAVE ERROR:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: error?.message || "Failed to save user permissions",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import UserPermission from "@/models/UserPermission";

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: Props
) {
  try {
    await connectDB();

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required",
        },
        {
          status: 400,
        }
      );
    }

    const permissions = await UserPermission.find({
      userId,
    })
      .populate("permissionId")
      .lean();

    return NextResponse.json(permissions);
  } catch (error: any) {
    console.error("USER PERMISSION GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load user permissions",
      },
      {
        status: 500,
      }
    );
  }
}