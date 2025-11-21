const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const { generateObjects } = require("./movement.js");
const { isProd } = require("./helpers.js");

const VALID_TOKEN = process.env.VALID_TOKEN;
console.log("VALID_TOKEN:", VALID_TOKEN);
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(o => o.trim().replace(/\/$/, ''))  // Видаляємо косу риску в кінці, якщо є
  .filter(Boolean);

console.log("Allowed origins:", allowedOrigins);

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    console.log('Origin allowed:', allowedOrigins.includes(origin));
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Mock server is running" });
});
app.get("/auth/me", (req, res) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies["authToken"];

  if (token === VALID_TOKEN) {
    return res.json({ authorized: true });
  }

  return res.json({ authorized: false });
});

app.post("/auth/login", (req, res) => {
  const { code } = req.body;

  if (code !== VALID_TOKEN) {
    return res.status(401).json({ error: "Invalid code" });
  }

  res.cookie("authToken", VALID_TOKEN, {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
  });

  res.json({ success: true });
});

app.post("/auth/logout", (req, res) => {
  console.log("Logout request");

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies["authToken"];

  // Очистити cookie
  res.clearCookie("authToken", {
    httpOnly: true,
    sameSite: isProd() ? "none" : "lax",
    secure: isProd(),
    path: "/",
  });

  // Закрити всі WS під цим токеном
  wss.clients.forEach(client => {
    const req = client._req;
    if (!req) return;

    const c = parseCookies(req.headers.cookie || "");
    if (c.authToken === token) {
      console.log("Closing WS after logout");
      client.close(4001, "Logged out");
    }
  });

  res.json({ success: true });
});

const server = app.listen(PORT, () => {
  console.log(`HTTP server running at http://localhost:${PORT}`);
});

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...v] = c.trim().split("=");
      return [key, v.join("=")];
    })
  );

const wss = new WebSocketServer({ server, path: "/stream" });

console.log("WebSocket stream available at ws://localhost:" + PORT + "/stream");

wss.on("connection", (ws, req) => {
  ws._req = req;        // <- ДОДАТИ ЦЕ

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies["authToken"];

  if (token !== VALID_TOKEN) {
    ws.close(4001, "Unauthorized");
    return;
  }

  console.log("WS authorized client connected");
});

wss.on("message", (message) => {
  console.log("WS message", message);
});

setInterval(() => {
  const data = JSON.stringify(generateObjects());

  wss.clients.forEach(client => {
    if (client.readyState !== 1) return;

    const req = client._req;  // <-- тепер точно є

    if (!req) {
      client.close(4001, "Unauthorized");
      return;
    }

    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies["authToken"];
    console.log("WS sending data to client", token);

    if (token !== VALID_TOKEN) {
      client.close(4001, "Unauthorized");
      return;
    }

    client.send(data);
  });

}, 1000);