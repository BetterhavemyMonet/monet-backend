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
  createTransferInstruction
} = require("@solana/spl-token");

const bs58 = require("bs58");
const b = bs58.default || bs58;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

const treasury = Keypair.fromSecretKey(
  b.decode(process.env.PRIVATE_KEY)
);

const ADMIN_KEY = process.env.ADMIN_KEY || "secret123";

const MINT = new PublicKey("6eACLGXCGdw9D5zb5eBKyFnFNTX9pTihDEpZQ7gYAX1b");

let game = { pot: 0, players: [] };
let roundActive = true;

// ⏱ AUTO ROUND TIMER (60 sec)
setInterval(async () => {
  if (game.players.length > 0) {
    console.log("⏱ Auto ending round...");
    await runPayout();
  }
}, 60000);

app.get("/", (req, res) => {
  res.send("🔥 Monet Backend LIVE 💰");
});

// 🎮 ENTER GAME (ANTI SPAM)
app.get("/enter", (req, res) => {
  const { wallet, score } = req.query;
  if (!wallet) return res.json({ error: "No wallet" });

  if (game.players.find(p => p.wallet === wallet)) {
    return res.json({ error: "Already entered" });
  }

  game.players.push({ wallet, score: Number(score || 0) });
  game.pot += 1;

  res.json({ success: true, game });
});

// 🏆 LEADERBOARD
app.get("/leaderboard", (req, res) => {
  const sorted = game.players.sort((a,b)=>b.score-a.score);
  res.json({ pot: game.pot, players: sorted });
});

// 🔐 ADMIN PAYOUT ONLY
app.get("/end", async (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) {
    return res.json({ error: "Unauthorized" });
  }

  const result = await runPayout();
  res.json(result);
});

// 💰 CORE PAYOUT LOGIC
async function runPayout() {
  if (game.players.length === 0) {
    return { error: "No players" };
  }

  const winner = game.players.reduce((a,b)=>a.score>b.score?a:b);

  try {
    const winnerPub = new PublicKey(winner.wallet);

    const fromATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      MINT,
      treasury.publicKey
    );

    const toATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasury,
      MINT,
      winnerPub
    );

    const tx = new Transaction().add(
      createTransferInstruction(
        fromATA.address,
        toATA.address,
        treasury.publicKey,
        game.pot * 1_000_000_000
      )
    );

    tx.feePayer = treasury.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const sig = await sendAndConfirmTransaction(connection, tx, [treasury]);

    const payout = {
      winner: winner.wallet,
      amount: game.pot,
      tx: sig
    };

    game = { pot: 0, players: [] };

    return { payout };

  } catch (e) {
    console.error(e);
    return { error: "Payout failed", details: e.message };
  }
}

app.listen(3000, () => console.log("🔥 Monet Backend SECURED 💰"));
