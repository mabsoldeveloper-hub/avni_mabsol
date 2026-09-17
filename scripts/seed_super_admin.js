const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const envPath = path.join(__dirname, "..", ".env");
let uri = "";
let superAdminEmail = "mabsoldeveloper@gmail.com";
let superAdminPassword = "Mab@5181";
let superAdminName = "Super Administrator";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("MONGODB_URI=")) {
      uri = trimmed.replace("MONGODB_URI=", "").trim().replace(/^["']|["']$/g, "");
    }
    if (trimmed.startsWith("SUPER_ADMIN_EMAIL=")) {
      superAdminEmail = trimmed.replace("SUPER_ADMIN_EMAIL=", "").trim().replace(/^["']|["']$/g, "");
    }
    if (trimmed.startsWith("SUPER_ADMIN_PASSWORD=")) {
      superAdminPassword = trimmed.replace("SUPER_ADMIN_PASSWORD=", "").trim().replace(/^["']|["']$/g, "");
    }
    if (trimmed.startsWith("SUPER_ADMIN_NAME=")) {
      superAdminName = trimmed.replace("SUPER_ADMIN_NAME=", "").trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function seedSuperAdmin() {
  if (!uri) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");

  const cleanEmail = superAdminEmail.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const existing = await usersCollection.findOne({ email: cleanEmail });

  if (!existing) {
    const result = await usersCollection.insertOne({
      name: superAdminName,
      email: cleanEmail,
      password: hashedPassword,
      roleType: "SuperAdmin",
      roleName: "SuperAdmin",
      role: "SuperAdmin",
      designation: "Platform Super Administrator",
      status: "Active",
      isApproved: true,
      isUnlimitedAccess: true,
      accessDurationDays: 9999,
      approvedAt: new Date(),
      termsAccepted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("✅ Super Admin account created in database:", {
      id: result.insertedId,
      email: cleanEmail,
      status: "Active",
      isApproved: true,
    });
  } else {
    await usersCollection.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: superAdminName,
          password: hashedPassword,
          roleType: "SuperAdmin",
          roleName: "SuperAdmin",
          role: "SuperAdmin",
          status: "Active",
          isApproved: true,
          isUnlimitedAccess: true,
          accessDurationDays: 9999,
          approvedAt: existing.approvedAt || new Date(),
          updatedAt: new Date(),
        },
      }
    );
    console.log("✅ Super Admin account updated & synced in database:", {
      id: existing._id,
      email: cleanEmail,
      status: "Active",
      isApproved: true,
    });
  }

  await mongoose.disconnect();
  console.log("Done!");
}

seedSuperAdmin().catch((err) => {
  console.error("Error seeding Super Admin:", err);
  process.exit(1);
});
