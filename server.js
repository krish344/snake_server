const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
});

let players = {};

io.on("connection", (socket) => {
  players[socket.id] = { id: socket.id, x: 50, y: 50, score: 0 };
  socket.broadcast.emit("new-player", players[socket.id]);
  socket.emit("all-players", players);

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("state-update", players);
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("player-left", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
