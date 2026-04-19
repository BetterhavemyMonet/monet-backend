const fs = require("fs");

let code = fs.readFileSync("server.js", "utf8");

// Add import if missing
if (!code.includes("getMint")) {
  code = code.replace(
    "@solana/spl-token');",
    "@solana/spl-token');\nconst { getMint } = require('@solana/spl-token');"
  );
}

// Inject decimals fetch before transfer
if (!code.includes("const DECIMALS")) {
  code = code.replace(
    "const mint = new PublicKey",
    `const mint = new PublicKey`
  );

  code = code.replace(
    "// SEND TOKENS",
    `
  // FETCH TOKEN DECIMALS
  const mintInfo = await getMint(connection, mint);
  const DECIMALS = mintInfo.decimals;

  console.log("🔥 TOKEN DECIMALS:", DECIMALS);

  // SEND TOKENS`
  );
}

// Replace hardcoded multiplier
code = code.replace(/1_000_000/g, "Math.pow(10, DECIMALS)");

fs.writeFileSync("server.js", code);
console.log("🚀 Auto-decimals enabled");
