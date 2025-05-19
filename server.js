```js
// server.js
const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

let players = {};   // { socketId: { name, color, score, snake: [{x,y},...], direction } }
let currentFood = [];
let currentQuestion = "";

// Generate a new math question and food positions
function genQuestion() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  currentQuestion = `What is ${a} + ${b}?`;
  const correct = a + b;
  // build set of one correct and three wrong answers
  const opts = new Set([correct]);
  while (opts.size < 4) {
    opts.add(Math.floor(Math.random() * 18) + 2);
  }
  // shuffle and assign random grid positions
  currentFood = Array.from(opts).map(val => ({
    value: val,
    x: Math.floor(Math.random() * 38) * 10,
    y: Math.floor(Math.random() * 38) * 10
  }));
}

io.on("connection", socket => {
  // Initialize new player state
  players[socket.id] = {
    name: null,
    color: null,
    score: 0,
    direction: { x: 0, y: 0 },
    snake: [{ x: 50, y: 50 }]
  };

  // Send initial game state and math question
  socket.emit("init", {
    players,
    question: currentQuestion,
    food: currentFood
  });

  // Player joins with name and color
  socket.on("join", ({ name, color }) => {
    if (!players[socket.id]) return;
    players[socket.id].name = name;
    players[socket.id].color = color;
    io.emit("players-update", players);
  });

  // Update player direction
  socket.on("direction", dir => {
    if (players[socket.id]) {
      players[socket.id].direction = dir;
    }
  });

  // Game tick: move snake, check collisions
  const MOVE_INTERVAL = setInterval(() => {
    const player = players[socket.id];
    if (!player) return;
    // Compute new head position
    const head = {
      x: player.snake[0].x + player.direction.x,
      y: player.snake[0].y + player.direction.y
    };
    // wrap edges
    if (head.x < 0) head.x = 390;
    if (head.x > 390) head.x = 0;
    if (head.y < 0) head.y = 390;
    if (head.y > 390) head.y = 0;

    // Add new head
    player.snake.unshift(head);

    // Check for food collision
    let ateCorrect = false;
    for (let i = 0; i < currentFood.length; i++) {
      const f = currentFood[i];
      if (Math.abs(head.x - f.x) < 10 && Math.abs(head.y - f.y) < 10) {
        const correct = (new Function('return ' + currentQuestion.match(/What is (.*)\?/)[1]))();
        if (f.value === correct) {
          player.score++;
          ateCorrect = true;
        }
        // generate next round
        genQuestion();
        io.emit("question-data", { question: currentQuestion, food: currentFood });
        break;
      }
    }

    // Remove tail if not growing
    if (!ateCorrect) {
      player.snake.pop();
    }

    // Broadcast updated players
    io.emit("players-update", players);
  }, 120);

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    clearInterval(MOVE_INTERVAL);
    delete players[socket.id];
    io.emit("players-update", players);
  });
});

// Initialize the first question
genQuestion();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
```
