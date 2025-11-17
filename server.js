const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

// Простий REST endpoint
app.get("/", (req, res) => {
  res.json({ status: "Mock server is running" });
});

// Стартуємо HTTP сервер
const server = app.listen(PORT, () => {
  console.log(`HTTP server running at http://localhost:${PORT}`);
});

// WebSocket сервер
const wss = new WebSocketServer({ server, path: "/stream" });

console.log("WebSocket stream available at ws://localhost:" + PORT + "/stream");

// Функція генерації мокових об'єктів
function generateObjects() {
  const count = 150;
  return Array.from({ length: count }).map((_, i) => ({
    id: `obj-${i}`,
    lat: 50.4501 + Math.random() * 0.01,
    lng: 30.5234 + Math.random() * 0.01,
    direction: Math.floor(Math.random() * 360),
    updatedAt: Date.now(),
  }));
}

// Стрімимо дані кожні 1 сек
setInterval(() => {
  const data = JSON.stringify(generateObjects());

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}, 1000);