# Element Tooling Suite

A self-hosted internal dashboard for network monitoring and device management tools. Built with React + Vite on the frontend and a Node.js/Express JWT auth service on the backend, served through nginx inside a single Docker container.

---

## Features

### Dashboard
- Live **device statistics** pulled from the Device Monitoring API (auto-refreshes every 30 seconds)
- **Tool health indicators** — per-tool online/offline/checking status badges (checked every 60 seconds)
- **Categorised tool grid** — tools grouped by category with collapsible sections
- **Favourites** — pin any tool to the top by dragging it into the Favourites section
- **Drag-to-reorder** — reorder tiles within and across sections in Edit Layout mode
- **Search** — live filter across all tool titles, descriptions and categories
- **Light / Dark mode** toggle, persisted per user in localStorage
- Per-user layout state (order, favourites, collapsed sections, theme) stored in localStorage

### Tools

| Tool | Category | Status |
|---|---|---|
| Device Surveyor | Discovery | Live |
| Device Monitoring API | Discovery | Live |
| Nmap Monitor | Monitoring | Live |
| Rundeck | Automation | Coming Soon |
| Rundeck Outputs | Automation | Coming Soon |
| Naming Tool | Utilities | Coming Soon |
| API Docs | Documentation | Coming Soon |

### Authentication
- JWT-based login with configurable expiry (default 8 hours)
- Passwords hashed with bcrypt (10 rounds)
- Tokens verified by nginx `auth_request` before proxying any `/api/` requests
- Bootstrap: if no `users.json` exists on first start, an admin account is created from `AUTH_USERNAME` / `AUTH_PASSWORD` environment variables

### User Management (Admin only)
Accessed via the ⚙ settings menu → **Manage Users**.

- **View all users** — lists username, role, and current tool visibility
- **Create users** — set username, password, and role (`user` / `admin`)
- **Delete users** — with confirmation; admins cannot delete their own account
- **Change passwords** — admins can reset any user's password; users can change their own
- **Tool visibility** — admins can hide specific tools per user account. Hidden tools are stored server-side and are applied on every login. Controlled via the collapsible **▸ Tool Visibility** panel on each user row

---

## API Endpoints

### Auth Service (`/auth/`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | None | Returns a signed JWT |
| `GET` | `/auth/verify` | Bearer | Validates a JWT (used by nginx) |
| `GET` | `/auth/users` | Admin | List all users with roles and hidden tools |
| `POST` | `/auth/users` | Admin | Create a new user |
| `DELETE` | `/auth/users/:username` | Admin | Delete a user |
| `PUT` | `/auth/users/:username/password` | Admin or self | Change password |
| `GET` | `/auth/users/:username/tools` | Admin or self | Get hidden tool IDs for a user |
| `PUT` | `/auth/users/:username/tools` | Admin | Update hidden tool IDs for a user |

---

## Running Locally (Dev)

Requires Node.js 20+.

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the auth service
cd auth-service
JWT_SECRET=dev-secret node index.js

# 3. In a second terminal, start Vite (proxies /auth to localhost:4000)
cd ..
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — default credentials are `admin` / `admin`.

---

## Docker Deployment

```bash
docker compose up -d
```

Available on port **3000**. Set environment variables in Portainer or a `.env` file:

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `change-me-to-a-random-secret` | **Change this** — signs all JWTs |
| `AUTH_USERNAME` | `admin` | Initial admin username (bootstrap only) |
| `AUTH_PASSWORD` | `admin` | Initial admin password (bootstrap only) |
| `JWT_EXPIRY` | `8h` | Token lifetime |
| `API_BACKEND` | `http://device-tracking-api:8001/` | Upstream for `/api/` requests |

> Bootstrap credentials are only used when no `users.json` exists. Changing them after first start has no effect — use the Manage Users panel instead.

User accounts are persisted in a named Docker volume (`auth-data`) and survive container restarts and rebuilds.

---

## Project Structure

```
├── src/
│   ├── tools.js              # Shared tool definitions (id, title, icon, category, etc.)
│   ├── components/
│   │   ├── Dashboard.jsx     # Main dashboard — stats, tool grid, drag/drop, search
│   │   ├── Login.jsx         # Login form
│   │   ├── UserManager.jsx   # Admin user management modal
│   │   ├── ToolCard.jsx      # Individual tool tile
│   │   ├── StatCard.jsx      # Overview stat tile
│   │   └── Toast.jsx         # Notification toasts
│   └── index.css             # Global styles + component styles
├── auth-service/
│   ├── index.js              # Express JWT auth service
│   └── data/users.json       # Persisted user accounts (gitignored in prod)
├── nginx.conf.template       # nginx config with auth_request gating
├── docker-entrypoint.sh      # Starts auth service then nginx
├── Dockerfile
└── docker-compose.yml
```
