const str = "vxÇâTx}{âÇèîXîüëè[wéojÇå ìåà`ÅéÅçü";
console.log("Raw hex:", Buffer.from(str, "latin1").toString("hex"));

// Check XOR or shifts
for (let key = 1; key < 256; key++) {
  const buf = Buffer.from(str, "latin1");
  for (let i = 0; i < buf.length; i++) buf[i] ^= key;
  const decoded = buf.toString("ascii");
  if (/^[a-zA-Z0-9\s.,-]+$/.test(decoded) && decoded.length > 5) {
    console.log(`XOR ${key}:`, decoded);
  }
}

// Check offset shift (e.g. c - offset)
for (let offset = -128; offset < 128; offset++) {
  const buf = Buffer.from(str, "latin1");
  let valid = true;
  for (let i = 0; i < buf.length; i++) {
    let c = (buf[i] + offset) & 0xff;
    if (c < 32 || c > 126) { valid = false; break; }
    buf[i] = c;
  }
  if (valid) {
    console.log(`Shift ${offset}:`, buf.toString("ascii"));
  }
}
