const axios = require("axios");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

async function testAll() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const l of envLines) {
      const [k, ...v] = l.split("=");
      if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
  console.log(`Testing against BASE_URL: ${BASE_URL}`);

  // 1. Test Company Catalog Query by GSTIN
  console.log("\n--- TEST 1: Query Company Catalog by GSTIN ---");
  try {
    const res = await axios.get(`${BASE_URL}/api/mabsolcrmsync/company-catalog?gstin=06ABHFR1456P1ZP`);
    console.log("Status:", res.status);
    console.log("Success:", res.data.success);
    console.log("Company:", res.data.data?.companyName);
    console.log("ShortCode:", res.data.data?.shortCode);
    console.log("Financial Years:", res.data.data?.financialYears?.map(f => f.companyDataCode));
    console.log("Active Company Code:", res.data.data?.activeCompanyDataCode);
  } catch (e) {
    console.error("Test 1 failed:", e.response?.data || e.message);
  }

  // 2. Test Company Catalog Query by ShortCode
  console.log("\n--- TEST 2: Query Company Catalog by ShortCode (MABSOL) ---");
  try {
    const res = await axios.get(`${BASE_URL}/api/mabsolcrmsync/company-catalog?shortCode=MABSOL`);
    console.log("Status:", res.status);
    console.log("Success:", res.data.success);
    console.log("GST:", res.data.data?.gstNo);
    console.log("ShortCode:", res.data.data?.shortCode);
    console.log("Financial Years:", res.data.data?.financialYears?.map(f => f.companyDataCode));
  } catch (e) {
    console.error("Test 2 failed:", e.response?.data || e.message);
  }

  // 3. Test Multi-Identifier Login Lookup
  console.log("\n--- TEST 3: Multi-Identifier Login Route Resolution ---");
  const testIdentifiers = [
    { label: "ShortCode", id: "MABSOL" },
    { label: "GSTIN", id: "06ABHFR1456P1ZP" },
    { label: "Unknown ID", id: "NON_EXISTENT_ID_999" }
  ];

  for (const t of testIdentifiers) {
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        identifier: t.id,
        password: "random_password_to_check_user_found",
        isDesktopAgent: true
      });
      console.log(`[${t.label}]:`, res.data);
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.message;
      console.log(`[${t.label}: ${t.id}] -> Status: ${status}, Message: "${msg}"`);
      // Notice: If status is 401 ("Invalid Password"), that means USER WAS FOUND! If 404, user not found.
      if (status === 401) {
        console.log(`  ==> SUCCESS: Account was successfully resolved by ${t.label}!`);
      } else if (status === 404) {
        console.log(`  ==> Properly rejected unlinked account.`);
      }
    }
  }

  console.log("\n--- Verification Completed ---");
}

testAll().catch(console.error);
