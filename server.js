require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bs58 = require("bs58");

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

const app = express();
app.use(cors());

const connection = new Connection("https://api.mainnet-beta.solana.com");

const TREASURY = Keypair.fromSecretKey(
  require("./keyfix")()
);

const MINT = new PublicKey("6eACLGXCGdw9D5zb5eBKyFnFNTX9pTihDEpZQ7gYAX1b");

let game = { pot: 0, players: [] };

app.get("/", (req, res) => {
  res.send("🔥 Monet Vault Backend LIVE");
});

app.get("/enter", (req, res) => {
  const { wallet, score } = req.query;

  game.players.push({ wallet, score: Number(score) });
  game.pot += 1;

  res.json({ success: true, game });
});

app.get("/leaderboard", (req, res) => {
  const sorted = game.players.sort((a,b)=>b.score-a.score);
  res.json({ pot: game.pot, players: sorted });
});

app.get("/end", async (req, res) => {
  try {
    if (game.players.length === 0)
      return res.json({ error: "No players" });

    const winner = game.players.reduce((a,b)=>a.score>b.score?a:b);

    const winnerPubkey = new PublicKey(winner.wallet);

    const fromToken = await getOrCreateAssociatedTokenAccount(
      connection,
      TREASURY,
      MINT,
      TREASURY.publicKey
    );

    const toToken = await getOrCreateAssociatedTokenAccount(
      connection,
      TREASURY,
      MINT,
      winnerPubkey
    );

    const tx = new Transaction().add(
      createTransferInstruction(
        fromToken.address,
        toToken.address,
        TREASURY.publicKey,
        Math.floor(game.pot * 1000000)
      )
    );

    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [TREASURY]
    );

    const result = {
      winner: winner.wallet,
      amount: game.pot,
      tx: sig
    };

    game = { pot: 0, players: [] };

    res.json({ payout: result });

  } catch (e) {
    res.json({ error: "Payout failed", details: e.message });
  }
});

app.listen(3000, () => console.log("🔥 Vault LIVE"));
