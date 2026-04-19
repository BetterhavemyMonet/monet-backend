const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Connection, PublicKey } = require("@solana/web3.js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let game = {
  pot: 0,
  players: []
};

// Add player
app.get("/enter", (req, res) => {
  const { wallet, score } = req.body;

  game.players.push({ wallet, score });
  game.pot += 1;

  res.json({ success: true, game });
});

// Get leaderboard
app.get("/leaderboard", (req, res) => {
  const sorted = game.players.sort((a,b)=>b.score-a.score);
  res.json({ pot: game.pot, players: sorted });
});

// End round
app.post("/end", (req, res) => {
  if (game.players.length === 0) return res.json({ error: "No players" });

  const winner = game.players.reduce((a,b)=>a.score>b.score?a:b);

  const payout = {
    winner: winner.wallet,
    amount: game.pot
  };

  // reset
  game = { pot: 0, players: [] };

  res.json({ payout });
});

app.get("/", (req, res) => res.send("🔥 Monet Backend is LIVE 🚀"));
app.get("/", (req, res) => res.send("🔥 Monet Backend LIVE"));
app.listen(3000, () => console.log("Server running on port 3000"));
