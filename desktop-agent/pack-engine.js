const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

// Secure internal packaging key & IV
const BUNDLE_KEY = crypto.createHash("sha256").update("MABSOL_PHARMA_CRM_SECURE_ENGINE_VAULT_2026").digest();
const BUNDLE_IV = crypto.createHash("md5").update("MABSOL_ENGINE_IV").digest();

function packEngine() {
  const engineDir = path.join(__dirname, "engine");
  const outputFile = path.join(__dirname, "engine_bundle.dat");

  if (!fs.existsSync(engineDir)) {
    console.warn("[pack-engine] Engine directory not found at:", engineDir);
    return;
  }

  // Ensure config.fpw exists in engineDir before packaging
  const engineFpw = path.join(engineDir, "config.fpw");
  if (!fs.existsSync(engineFpw)) {
    fs.writeFileSync(
      engineFpw,
      "SCREEN = OFF\r\nRESOURCE = OFF\r\nTITLE = \r\nSYSMENU = OFF\r\nSTATUS BAR = OFF\r\nDEVELOPMENT = OFF\r\nESCAPE = OFF\r\nCONFIRM = OFF\r\nNOTIFY = OFF\r\nTALK = OFF\r\nSAFETY = OFF\r\n",
      "utf8"
    );
  }

  const files = fs.readdirSync(engineDir).filter((f) => {
    const lower = f.toLowerCase();
    return !lower.endsWith(".pdb") && !lower.endsWith(".txt") && !lower.endsWith(".bak");
  });

  console.log(`[pack-engine] Packaging ${files.length} engine files into encrypted bundle...`);

  const fileMap = {};
  for (const file of files) {
    const fullPath = path.join(engineDir, file);
    if (fs.statSync(fullPath).isFile()) {
      const buffer = fs.readFileSync(fullPath);
      fileMap[file] = buffer.toString("base64");
      console.log(`  + Packaged: ${file} (${buffer.length} bytes)`);
    }
  }

  const jsonPayload = JSON.stringify(fileMap);
  const compressed = zlib.gzipSync(Buffer.from(jsonPayload, "utf8"), { level: 9 });

  const cipher = crypto.createCipheriv("aes-256-cbc", BUNDLE_KEY, BUNDLE_IV);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);

  fs.writeFileSync(outputFile, encrypted);
  console.log(`[pack-engine] Encrypted bundle created: ${outputFile} (${encrypted.length} bytes)`);
}

packEngine();
