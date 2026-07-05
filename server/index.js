const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory store per room:
// {
//   docText, codeText, codeLanguage,
//   users: Map<socketId, {name, color}>,
//   chatMessages: [{id, name, color, text, timestamp}],
//   docHistory: [{text, author, timestamp}],
//   codeHistory: [{text, author, timestamp}],
//   lastDocSnapshot, lastCodeSnapshot,
//   lastTyping: Map<"socketId:page", timestamp>
// }
const rooms = new Map();

const COLORS = [
  "#EB9830", "#936A0B", "#D1A720", "#7F640F",
  "#BE7A25", "#8F5B19", "#A58317", "#694A05",
];

const SNAPSHOT_INTERVAL_MS = 4000;
const TYPING_THROTTLE_MS = 3000;
const HISTORY_LIMIT = 40;
const CHAT_LIMIT = 200;

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      docText: "",
      codeText: "",
      codeLanguage: "javascript",
      users: new Map(),
      chatMessages: [],
      docHistory: [],
      codeHistory: [],
      lastDocSnapshot: 0,
      lastCodeSnapshot: 0,
      lastTyping: new Map(),
    });
  }
  return rooms.get(roomId);
}

function broadcastUserList(roomId) {
  const room = getRoom(roomId);
  const users = Array.from(room.users.entries()).map(([id, u]) => ({
    id,
    name: u.name,
    color: u.color,
  }));
  io.to(roomId).emit("users", users);
}

function maybeSnapshot(room, roomId, kind, text, author) {
  const now = Date.now();
  const lastKey = kind === "doc" ? "lastDocSnapshot" : "lastCodeSnapshot";
  const histKey = kind === "doc" ? "docHistory" : "codeHistory";
  if (now - room[lastKey] < SNAPSHOT_INTERVAL_MS) return;
  room[histKey].push({ text, author: author || "Anonymous", timestamp: now });
  if (room[histKey].length > HISTORY_LIMIT) room[histKey].shift();
  room[lastKey] = now;
  io.to(roomId).emit(kind === "doc" ? "doc-history" : "code-history", room[histKey]);
}

app.get("/health", (req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  let currentRoom = null;

  socket.on("join", ({ roomId, name }) => {
    currentRoom = roomId;
    socket.join(roomId);
    const room = getRoom(roomId);
    const color = COLORS[room.users.size % COLORS.length];
    room.users.set(socket.id, { name: name || "Anonymous", color });

    socket.emit("init", {
      docText: room.docText,
      codeText: room.codeText,
      codeLanguage: room.codeLanguage,
      chatMessages: room.chatMessages,
      docHistory: room.docHistory,
      codeHistory: room.codeHistory,
    });
    broadcastUserList(roomId);
  });

  socket.on("doc-change", ({ roomId, text, author }) => {
    const room = getRoom(roomId);
    room.docText = text;
    socket.to(roomId).emit("doc-change", { text });
    maybeSnapshot(room, roomId, "doc", text, author);
  });

  socket.on("code-change", ({ roomId, code, author }) => {
    const room = getRoom(roomId);
    room.codeText = code;
    socket.to(roomId).emit("code-change", { code });
    maybeSnapshot(room, roomId, "code", code, author);
  });

  socket.on("language-change", ({ roomId, language }) => {
    const room = getRoom(roomId);
    room.codeLanguage = language;
    socket.to(roomId).emit("language-change", { language });
  });

  socket.on("doc-cursor", ({ roomId, position }) => {
    socket.to(roomId).emit("doc-cursor", { id: socket.id, position });
  });

  socket.on("code-cursor", ({ roomId, position }) => {
    socket.to(roomId).emit("code-cursor", { id: socket.id, position });
  });

  socket.on("typing", ({ roomId, page }) => {
    const room = getRoom(roomId);
    const user = room.users.get(socket.id);
    if (!user) return;
    const key = `${socket.id}:${page}`;
    const now = Date.now();
    const last = room.lastTyping.get(key) || 0;
    if (now - last < TYPING_THROTTLE_MS) return;
    room.lastTyping.set(key, now);
    socket.to(roomId).emit("typing", { name: user.name, page });
  });

  socket.on("chat-message", ({ roomId, text }) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const room = getRoom(roomId);
    const user = room.users.get(socket.id);
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: user ? user.name : "Anonymous",
      color: user ? user.color : "#EB9830",
      text: trimmed.slice(0, 2000),
      timestamp: Date.now(),
    };
    room.chatMessages.push(message);
    if (room.chatMessages.length > CHAT_LIMIT) room.chatMessages.shift();
    io.to(roomId).emit("chat-message", message);
  });

  socket.on("disconnect", () => {
    if (currentRoom) {
      const room = getRoom(currentRoom);
      room.users.delete(socket.id);
      broadcastUserList(currentRoom);
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Code Weave server running on port ${PORT}`);
});
