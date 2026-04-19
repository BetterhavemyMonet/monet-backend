require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const {
  Connection,
  Keypair,
  PublicKey,
  Transaction
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

const connection = new Connection("https://api.mainnet-beta.solana.com");

// 🔐 Treasury wallet from Render ENV
const treasury = Keypair.fromSecretKey(
  b.decode(process.env.PRIVATE_KEY)
);

const MINT = new PublicKey("6eACLGXCGdw9D5zb5eBKyFnFNTX9pTihDEpZQ7gYAX1b");

let game = { pot: 0, players: [] };

app.get("/", (req, res) => {
  res.send("🔥 Monet Backend LIVE 💰");
});

// 🎮 Enter game
app.get("/enter", (req, res) => {
  const { wallet, score } = req.query;
  if (!wallet) return res.json({ error: "No wallet" });

  game.players.push({ wallet, score: Number(score || 0) });
  game.pot += 1;

  res.json({ success: true, game });
});

// 🏆 Leaderboard
app.get("/leaderboard", (req, res) => {
  const sorted = game.players.sort((a,b)=>b.score-a.score);
  res.json({ pot: game.pot, players: sorted });
});

// 💰 END GAME + PAYOUT
app.get("/end", async (req, res) => {
  if (game.players.length === 0) {
    return res.json({ error: "No players" });
  }

  const winner = game.players.reduce((a,b)=>a.score>b.score?a:b);

  try {
    const winnerPub = new PublicKey(winner.wallet);

    // Ensure token accounts exist
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

    tx.sign(treasury);

    const sig = await connection.sendRawTransaction(tx.serialize());

    const payout = {
      winner: winner.wallet,
      amount: game.pot,
      tx: sig
    };

    // reset game
    game = { pot: 0, players: [] };

    res.json({ payout });

  } catch (e) {
    console.error(e);
    res.json({ error: "Payout failed", details: e.message });
  }
});

app.listen(3000, () => console.log("🔥 Monet Backend with payouts LIVE"));
