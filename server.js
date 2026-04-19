require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let game = { pot: 0, players: [] };

app.get("/", (req, res) => {
  res.send("🔥 Monet Backend LIVE 🚀");
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

app.get("/end", (req, res) => {
  if (game.players.length === 0) return res.json({ error: "No players" });

  const winner = game.players.reduce((a,b)=>a.score>b.score?a:b);

  const result = {
    winner: winner.wallet,
    amount: game.pot
  };

  game = { pot: 0, players: [] };

  res.json({ payout: result });
});

app.listen(3000, () => console.log("🔥 Backend LIVE"));
