require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} = require("@solana/web3.js");

const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getMint
} = require("@solana/spl-token");

const bs58mod = require("bs58");
const bs58 = bs58mod.decode ? bs58mod : bs58mod.default;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const connection = new Connection("https://api.mainnet-beta.solana.com");

// 🔐 TREASURY
const treasury = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));

// 🪙 MONET TOKEN
const mint = new PublicKey("6eACLGXCGdw9D5zb5eBKyFnFNTX9pTihDEpZQ7gYAX1b");

// 🎮 GAME STATE
let game = { pot: 0, players: [] };
const ENTRY_FEE = 1;

app.get("/", (req, res) => {
  res.send("🔥 Monet Backend LIVE 🚀");
});

// 🎮 ENTER GAME
app.get("/enter", (req, res) => {
  const { wallet, score } = req.query;

  try {
    new PublicKey(wallet);
  } catch {
    return res.json({ error: "Invalid wallet" });
  }

  if (!game.players.find(p => p.wallet === wallet)) {
    game.players.push({ wallet, score: Number(score) });
    game.pot += ENTRY_FEE;
  }

  return res.json({ success: true, game });
});

// 🏆 END GAME + PAYOUT
app.get("/end", async (req, res) => {
  try {
    if (game.players.length === 0) {
      return res.json({ error: "No players" });
    }

    if (game.pot <= 0) {
      return res.json({ error: "Empty pot" });
    }

    const winner = game.players.reduce((a, b) =>
      a.score > b.score ? a : b
    );

    const payoutAmount = game.pot;

    // 🔍 FETCH DECIMALS
    const mintInfo = await getMint(connection, mint);
    const DECIMALS = mintInfo.decimals;

    // 🏦 FROM ATA
    const fromATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      mint,
      treasury.publicKey
    );

    // 🎯 TO ATA
    const toATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      mint,
      new PublicKey(winner.wallet)
    );

    // 💸 TRANSFER
    const tx = new Transaction().add(
      createTransferInstruction(
        fromATA.address,
        toATA.address,
        treasury.publicKey,
        payoutAmount * Math.pow(10, DECIMALS)
      )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [treasury]);

    console.log("🏆 WINNER:", winner.wallet);
    console.log("💰 AMOUNT:", payoutAmount);
    console.log("🔗 TX:", sig);

    // RESET GAME AFTER PAYOUT
    game = { pot: 0, players: [] };

    return res.json({
      payout: {
        winner: winner.wallet,
        amount: payoutAmount,
        tx: sig
      }
    });

  } catch (e) {
    console.error("💥 ERROR:", e);
    return res.json({
      error: "Payout failed",
      details: e.message
    });
  }
});

app.listen(3000, () => console.log("🔥 Backend LIVE"));
