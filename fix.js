const fs = require("fs");

let code = fs.readFileSync("server.js", "utf8");

// Fix import
if (!code.includes("sendAndConfirmTransaction")) {
  code = code.replace(
    'const { Connection, Keypair, PublicKey, Transaction } = require("@solana/web3.js");',
    'const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");'
  );
}

// Fix incorrect usage
code = code.replace(
  /connection\.sendAndConfirmTransaction/g,
  "sendAndConfirmTransaction"
);

fs.writeFileSync("server.js", code);
console.log("✅ FIXED sendAndConfirmTransaction");
