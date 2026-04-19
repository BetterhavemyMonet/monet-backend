const bs58 = require("bs58");

function loadKey() {
  const key = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_JSON;

  if (!key) throw new Error("❌ No private key found in env");

  // Try JSON array first
  try {
    const arr = JSON.parse(key);
    if (Array.isArray(arr)) {
      console.log("✅ Loaded JSON key");
      return Uint8Array.from(arr);
    }
  } catch {}

  // Try base58
  try {
    console.log("✅ Loaded base58 key");
    return bs58.decode(key);
  } catch {}

  throw new Error("❌ Invalid key format");
}

module.exports = loadKey;
