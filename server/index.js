import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

// Load .env from the server/ directory regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Credentials (override via .env) ────────────────────────────────────────
const STATIC_USERNAME = process.env.AUTH_USERNAME ?? "admin";
const STATIC_PASSWORD = process.env.AUTH_PASSWORD ?? "element";

// ─── JWT configuration ───────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET ?? "ets-dev-secret-change-in-production";
const JWT_EXPIRY = "8h";

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

// ─── POST /login ──────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};

  if (username !== STATIC_USERNAME || password !== STATIC_PASSWORD) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign(
    { sub: username, role: "user" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({ token });
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ─── GET /auth/verify ─────────────────────────────────────────────────────────
// Client calls this on mount to validate a saved token.
app.get("/auth/verify", authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
