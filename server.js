const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const players = {};

io.on("connection", (socket) => {
  console.log("New player:", socket.id);

  const takenColors = Object.values(players).map(p => p.color);
  socket.emit("choose-color", takenColors);

  socket.on("color-chosen", (color) => {
    players[socket.id] = { x: 50, y: 50, score: 0, color };
    io.emit("all-players", players);
  });

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("state-update", players);
    }
  });

  socket.on("disconnect", () => {
    console.log("Player left:", socket.id);
    delete players[socket.id];
    io.emit("player-left", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
