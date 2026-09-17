import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Customer from "@/models/Customer";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* ============================================================
   GET
   ------------------------------------------------------------
   D32 MR / Field Staff jo Users me already added hain unki
   Customer ID -> User ID mapping return karta hai.
   ============================================================ */

export async function GET() {
    try {
        await connectDB();

        const currentUser = await getCurrentUser();

        /* ------------------------------------------------------
           1. Direct mapping by mrCustomerId
           ------------------------------------------------------ */

        const userQuery: any = {
            mrCustomerId: {
                $exists: true,
                $ne: null,
            },
        };

        if (currentUser?.tenantId) {
            userQuery.tenantId = currentUser.tenantId;
        }

        const users = await User.find(
            userQuery,
            {
                _id: 1,
                mrCustomerId: 1,
                name: 1,
                mobile: 1,
                tenantId: 1,
            }
        ).lean();

        const mrUserIds: Record<string, string> = {};

        users.forEach((user: any) => {
            if (user.mrCustomerId) {
                mrUserIds[String(user.mrCustomerId)] =
                    String(user._id);
            }
        });

        /* ------------------------------------------------------
           2. Legacy protection
           ------------------------------------------------------
           Agar purana MR User hai jisme mrCustomerId nahi hai,
           to Customer ke PARNAM + PHONE4 se match karenge.
           ------------------------------------------------------ */

        const mrCustomers = await Customer.find(
            {
                SCODE: "D32",
            },
            {
                _id: 1,
                PARNAM: 1,
                PHONE4: 1,
            }
        ).lean();

        const userListQuery: any = {
            roleType: "MR",
        };

        if (currentUser?.tenantId) {
            userListQuery.tenantId = currentUser.tenantId;
        }

        const legacyUsers = await User.find(
            userListQuery,
            {
                _id: 1,
                name: 1,
                mobile: 1,
                mrCustomerId: 1,
            }
        ).lean();

        const legacyMap = new Map<string, string>();

        legacyUsers.forEach((user: any) => {
            const name = String(user.name || "")
                .trim()
                .toLowerCase();

            const mobile = String(user.mobile || "").trim();

            if (!name || !mobile) {
                return;
            }

            const key = `${name}__${mobile}`;

            legacyMap.set(
                key,
                String(user._id)
            );
        });

        /* ------------------------------------------------------
           3. Match legacy Users with D32 Customers
           ------------------------------------------------------ */

        mrCustomers.forEach((customer: any) => {
            const customerId = String(
                customer._id || ""
            ).trim();

            if (!customerId || mrUserIds[customerId]) {
                return;
            }

            const name = String(
                customer.PARNAM || ""
            )
                .trim()
                .toLowerCase();

            const mobile = String(
                customer.PHONE4 || ""
            ).trim();

            if (!name || !mobile) {
                return;
            }

            const key = `${name}__${mobile}`;

            const userId = legacyMap.get(key);

            if (userId) {
                mrUserIds[customerId] = userId;
            }
        });

        /* ------------------------------------------------------
           4. No cache
           ------------------------------------------------------ */

        return NextResponse.json(
            {
                success: true,
                mrUserIds,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate, proxy-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            }
        );
    } catch (error: any) {
        console.error(
            "GET /api/users/mr error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    error?.message ||
                    "Failed to load MR Users.",
            },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }
}


/* ============================================================
   POST
   ------------------------------------------------------------
   D32 Customer / MR ko Users collection me add/update karta hai.
   ============================================================ */

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const currentUser = await getCurrentUser();

        /* ------------------------------------------------------
           1. Request body
           ------------------------------------------------------ */

        const body = await req.json();

        const customerId = String(
            body?.customerId || ""
        ).trim();

        if (!customerId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Customer ID is required.",
                },
                {
                    status: 400,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        /* ------------------------------------------------------
           2. Customer find
           ------------------------------------------------------ */

        const customer: any = await Customer.findById(
            customerId
        ).lean();

        if (!customer) {
            return NextResponse.json(
                {
                    success: false,
                    error: "MR Customer not found.",
                },
                {
                    status: 404,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        /* ------------------------------------------------------
           3. Only D32 allowed
           ------------------------------------------------------ */

        const scode = String(
            customer.SCODE || ""
        )
            .trim()
            .toUpperCase();

        if (scode !== "D32") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Only MR / Field Staff (SCODE D32) can be added to Users.",
                },
                {
                    status: 400,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        /* ------------------------------------------------------
           4. MR data mapping

           Customer:
           PARNAM  -> User.name
           PHONE4  -> User.mobile
           CITY    -> User.city
           PARADD  -> address
           PARADD1 -> address
           PARADD2 -> address
           ------------------------------------------------------ */

        const name = String(
            customer.PARNAM || ""
        ).trim();

        const mobile = String(
            customer.PHONE4 || ""
        ).trim();

        const city = String(
            customer.CITY || ""
        ).trim();

        const addressParts = [
            customer.PARADD,
            customer.PARADD1,
            customer.PARADD2,
        ]
            .map((value) =>
                String(value || "").trim()
            )
            .filter(Boolean);

        const address = addressParts.join(", ");

        if (!name) {
            return NextResponse.json(
                {
                    success: false,
                    error: "MR name (PARNAM) is missing.",
                },
                {
                    status: 400,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        /* ------------------------------------------------------
           5. Tenant
           ------------------------------------------------------ */

        const tenantId =
            currentUser?.tenantId || "TENANT001";

        /* ------------------------------------------------------
           6. Existing User check
           ------------------------------------------------------
           First priority:
           mrCustomerId
           ------------------------------------------------------ */

        let user: any = await User.findOne({
            mrCustomerId: customer._id,
        });

        /* ------------------------------------------------------
           7. Legacy User check
           ------------------------------------------------------
           Agar mrCustomerId nahi hai to:
           tenant + name + mobile + roleType MR
           ------------------------------------------------------ */

        if (!user) {
            const legacyQuery: any = {
                tenantId,
                name,
                mobile,
                roleType: "MR",
            };

            user = await User.findOne(
                legacyQuery
            );
        }

        /* ------------------------------------------------------
           8. Existing User mil gaya
           ------------------------------------------------------ */

        if (user) {
            /*
             * Existing user ko current MR Customer ke saath
             * permanently link kar do.
             */

            user.mrCustomerId = customer._id;

            user.name = name;
            user.mobile = mobile;
            user.city = city;
            user.address = address;

            user.roleType = "MR";
            user.designation = "M.R.";
            user.status = "Active";

            if (
                !user.employeeCode &&
                customer.ORDNO
            ) {
                user.employeeCode = String(
                    customer.ORDNO
                ).trim();
            }

            await user.save();

            return NextResponse.json(
                {
                    success: true,
                    message: "MR already existed and has been linked successfully.",
                    user: {
                        _id: String(user._id),
                        mrCustomerId: String(
                            user.mrCustomerId
                        ),
                        name: user.name,
                        mobile: user.mobile,
                        city: user.city,
                        address: user.address,
                    },
                },
                {
                    status: 200,
                    headers: {
                        "Cache-Control":
                            "no-store, no-cache, must-revalidate",
                    },
                }
            );
        }

        /* ------------------------------------------------------
           9. New User create
           ------------------------------------------------------ */

        /*
         * Unique email generate karenge.
         */

        const cleanName = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "")
            .slice(0, 30);

        const randomPart = crypto
            .randomBytes(4)
            .toString("hex");

        const email =
            `${cleanName || "mr"}.${randomPart}@mabsol.local`;

        /*
         * Temporary random password.
         * Password database me bcrypt hash ke form me save hoga.
         */

        const temporaryPassword =
            crypto
                .randomBytes(12)
                .toString("base64")
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 12) || "Mabsol@123";

        const hashedPassword =
            await bcrypt.hash(
                temporaryPassword,
                10
            );

        /* ------------------------------------------------------
           10. New User object
           ------------------------------------------------------ */

        const userData: any = {
            tenantId,

            name,
            email,
            password: hashedPassword,

            roleType: "MR",

            mrCustomerId: customer._id,

            status: "Active",

            mobile,

            designation: "M.R.",

            department: "Pharma",

            employeeCode: String(
                customer.ORDNO || ""
            ).trim(),

            address,

            city,

            state: String(
                customer.STATE || ""
            ).trim(),

            country: String(
                customer.COUNTRY || ""
            ).trim(),

            pincode: String(
                customer.PINCODE || ""
            ).trim(),
        };

        /*
         * Agar customer me companyId available hai
         * to User me bhi save karenge.
         */

        if (customer.companyId) {
            userData.companyId =
                customer.companyId;
        }

        const newUser = await User.create(
            userData
        );

        /* ------------------------------------------------------
           11. Success response
           ------------------------------------------------------ */

        return NextResponse.json(
            {
                success: true,
                message: "MR added to Users successfully.",
                user: {
                    _id: String(newUser._id),
                    mrCustomerId: String(
                        newUser.mrCustomerId
                    ),
                    name: newUser.name,
                    email: newUser.email,
                    mobile: newUser.mobile,
                    city: newUser.city,
                    address: newUser.address,
                    roleType: newUser.roleType,
                    status: newUser.status,
                },
            },
            {
                status: 201,
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error: any) {
        console.error(
            "POST /api/users/mr error:",
            error
        );

        /* ------------------------------------------------------
           Duplicate key protection
           ------------------------------------------------------ */

        if (error?.code === 11000) {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        "This MR is already added to Users.",
                },
                {
                    status: 409,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error:
                    error?.message ||
                    "Failed to add MR to Users.",
            },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store",
                },
            }
        );
    }
}