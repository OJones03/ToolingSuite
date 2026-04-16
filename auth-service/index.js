import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 4000;

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "8h";
const BCRYPT_ROUNDS = 10;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET environment variable");
  process.exit(1);
}

// ── User store ────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || "/auth/data";
const USERS_FILE = path.join(DATA_DIR, "users.json");

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveUsers(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Bootstrap: create initial admin from env vars if no users file exists
async function bootstrap() {
  if (loadUsers()) return;
  const username = process.env.AUTH_USERNAME || "admin";
  const password = process.env.AUTH_PASSWORD || "admin";
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  saveUsers([{ username, passwordHash: hash, role: "admin" }]);
  console.log(`Bootstrapped users file with admin user "${username}"`);
}

await bootstrap();

app.use(cors());
app.use(express.json());

// ── Middleware ────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
}

// ── Auth endpoints ────────────────────────────────────────

// Login — validate credentials and return a signed JWT
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const users = loadUsers() ?? [];
  const user = users.find((u) => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign(
    { sub: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({ token });
});

// Verify — used by nginx auth_request to gate /api/ access
app.get("/auth/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    jwt.verify(token, JWT_SECRET);
    res.sendStatus(200);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ── User management endpoints (admin only) ────────────────

// List users
app.get("/auth/users", authenticateToken, requireAdmin, (req, res) => {
  const users = loadUsers() ?? [];
  res.json(users.map(({ username, role, hiddenTools }) => ({ username, role, hiddenTools: hiddenTools ?? [] })));
});

// Create user
app.post("/auth/users", authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'admin' or 'user'" });
  }
  // Validate username: alphanumeric, hyphens, underscores only
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username)) {
    return res.status(400).json({ error: "Username may only contain letters, numbers, hyphens and underscores (max 64 chars)" });
  }

  const users = loadUsers() ?? [];
  if (users.find((u) => u.username === username)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  users.push({ username, passwordHash, role });
  saveUsers(users);
  res.status(201).json({ username, role });
});

// Delete user
app.delete("/auth/users/:username", authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.params;
  if (username === req.user.sub) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  const users = loadUsers() ?? [];
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return res.status(404).json({ error: "User not found" });

  users.splice(idx, 1);
  saveUsers(users);
  res.sendStatus(204);
});

// Change password (admin can change anyone's; user can change their own)
app.put("/auth/users/:username/password", authenticateToken, async (req, res) => {
  const { username } = req.params;
  const { password } = req.body ?? {};

  if (req.user.role !== "admin" && req.user.sub !== username) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const users = loadUsers() ?? [];
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  saveUsers(users);
  res.sendStatus(204);
});

// ── Custom tools store ────────────────────────────────────
const CUSTOM_TOOLS_FILE = path.join(DATA_DIR, "custom-tools.json");

function loadCustomTools() {
  try {
    return JSON.parse(fs.readFileSync(CUSTOM_TOOLS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveCustomTools(tools) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CUSTOM_TOOLS_FILE, JSON.stringify(tools, null, 2));
}

// Get all custom tools (any authenticated user)
app.get("/auth/custom-tools", authenticateToken, (req, res) => {
  res.json(loadCustomTools());
});

// Create custom tool (admin only)
app.post("/auth/custom-tools", authenticateToken, requireAdmin, (req, res) => {
  const { title, icon, description, href, badge, category } = req.body ?? {};
  if (!title || !description || !badge || !category) {
    return res.status(400).json({ error: "title, description, badge and category are required" });
  }
  const tools = loadCustomTools();
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const hrefVal = href ? String(href).slice(0, 500) : null;
  const tool = {
    id,
    title: String(title).slice(0, 100),
    icon: String(icon || "🔧").slice(0, 10),
    description: String(description).slice(0, 500),
    href: hrefVal,
    target: hrefVal ? "_blank" : null,
    badge: String(badge).slice(0, 30),
    category: String(category).slice(0, 50),
    placeholder: !hrefVal,
    custom: true,
  };
  tools.push(tool);
  saveCustomTools(tools);
  res.status(201).json(tool);
});

// Update custom tool (admin only)
app.put("/auth/custom-tools/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, icon, description, href, badge, category } = req.body ?? {};
  const tools = loadCustomTools();
  const idx = tools.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Tool not found" });
  const existing = tools[idx];
  const hrefVal = href !== undefined ? (href || null) : existing.href;
  tools[idx] = {
    ...existing,
    title: title ? String(title).slice(0, 100) : existing.title,
    icon: icon !== undefined ? String(icon || "🔧").slice(0, 10) : existing.icon,
    description: description ? String(description).slice(0, 500) : existing.description,
    href: hrefVal,
    target: hrefVal ? "_blank" : null,
    badge: badge ? String(badge).slice(0, 30) : existing.badge,
    category: category ? String(category).slice(0, 50) : existing.category,
    placeholder: !hrefVal,
  };
  saveCustomTools(tools);
  res.json(tools[idx]);
});

// Delete custom tool (admin only)
app.delete("/auth/custom-tools/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const tools = loadCustomTools();
  const idx = tools.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Tool not found" });
  tools.splice(idx, 1);
  saveCustomTools(tools);
  res.sendStatus(204);
});

// Get hidden tools for a user (admin or self)
app.get("/auth/users/:username/tools", authenticateToken, (req, res) => {
  const { username } = req.params;
  if (req.user.role !== "admin" && req.user.sub !== username) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const users = loadUsers() ?? [];
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ hiddenTools: user.hiddenTools ?? [] });
});

// Update hidden tools for a user (admin only)
app.put("/auth/users/:username/tools", authenticateToken, requireAdmin, (req, res) => {
  const { username } = req.params;
  const { hiddenTools } = req.body ?? {};
  if (!Array.isArray(hiddenTools)) {
    return res.status(400).json({ error: "hiddenTools must be an array" });
  }
  if (!hiddenTools.every((id) => typeof id === "string" && id.length <= 128)) {
    return res.status(400).json({ error: "Invalid tool IDs" });
  }
  const users = loadUsers() ?? [];
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.hiddenTools = hiddenTools;
  saveUsers(users);
  res.sendStatus(204);
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
