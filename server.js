// server.js
const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

let players = {};   // { socketId: { x,y,score,color,name } }
let currentFood = [];
let currentQuestion = "";

function genQuestion() {
  const a = Math.floor(Math.random()*10)+1;
  const b = Math.floor(Math.random()*10)+1;
  currentQuestion = `What is ${a} + ${b}?`;
  const correct = a + b;
  // generate 3 wrong answers
  const opts = new Set([correct]);
  while (opts.size < 4) opts.add(Math.floor(Math.random()*18)+2);
  // shuffle and assign random positions
  currentFood = Array.from(opts).map(val => ({
    value: val,
    x: Math.floor(Math.random()*38)*10,
    y: Math.floor(Math.random()*38)*10
  }));
}

io.on("connection", socket => {
  // init player
  players[socket.id] = { x:50, y:50, score:0, color:null, name:null };

  // send existing state + current question+food
  socket.emit("init", { players, question: currentQuestion, food: currentFood });

  // join with name/color
  socket.on("join", ({ name, color }) => {
    players[socket.id].name = name;
    players[socket.id].color = color;
    io.emit("players-update", players);
  });

  // movement
  socket.on("move", ({ x,y }) => {
    if (!players[socket.id]) return;
    players[socket.id].x = x; 
    players[socket.id].y = y;
    io.emit("players-update", players);
    // check for collision with any food
    for (let i = 0; i < currentFood.length; i++) {
      const f = currentFood[i];
      if (Math.abs(x - f.x) < 10 && Math.abs(y - f.y) < 10) {
        // one player ate first—freeze others until next question
        const chosen = f.value;
        const correct = eval(currentQuestion.split("What is ")[1].replace("?", ""));
        if (chosen === correct) {
          players[socket.id].score++;
        }
        // broadcast eat result and updated score
        io.emit("players-update", players);
        // generate next round
        genQuestion();
        io.emit("question-data", { question: currentQuestion, food: currentFood });
        break;
      }
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("players-update", players);
  });
});

// initial question
genQuestion();

const PORT = process.env.PORT||3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
