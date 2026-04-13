import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 4001;

// ─── Static credentials (replace with a real DB + bcrypt) ───────────────────
const STATIC_USERNAME = process.env.AUTH_USERNAME || "admin";
const STATIC_PASSWORD = process.env.AUTH_PASSWORD || "password123";

// ─── JWT configuration ───────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "8h";

if (!JWT_SECRET) {
  console.error("ERROR: Missing JWT_SECRET environment variable");
  process.exit(1);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── POST /login ──────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};

  if (username !== STATIC_USERNAME || password !== STATIC_PASSWORD) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign(
    { sub: username, role: "admin" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({ token });
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ─── GET /protected — token validation endpoint ───────────────────────────────
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});
