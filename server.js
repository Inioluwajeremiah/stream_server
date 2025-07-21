// server.js (One-to-One Call Signaling Server)
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const usersInRoom = {}; // roomId => [socketId1, socketId2]

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);

    if (!usersInRoom[roomId]) usersInRoom[roomId] = [];
    usersInRoom[roomId].push(socket.id);

    const otherUser = usersInRoom[roomId].find((id) => id !== socket.id);
    if (otherUser) {
      socket.emit("other-user", otherUser);
      socket.to(otherUser).emit("user-joined", socket.id);
    }
  });

  socket.on("offer", ({ targetId, sdp }) => {
    io.to(targetId).emit("offer", { senderId: socket.id, sdp });
  });

  socket.on("answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("answer", { senderId: socket.id, sdp });
  });

  socket.on("ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("ice-candidate", { senderId: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    for (const roomId in usersInRoom) {
      usersInRoom[roomId] = usersInRoom[roomId].filter(
        (id) => id !== socket.id
      );
      socket.to(roomId).emit("user-disconnected", socket.id);
      if (usersInRoom[roomId].length === 0) delete usersInRoom[roomId];
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () =>
  console.log("Signaling server running on http://localhost:3000")
);
