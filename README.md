# Element Tooling Suite

A self-hosted internal dashboard for network monitoring and device management tools. Built with React + Vite on the frontend and a Node.js/Express JWT auth service on the backend, served through nginx inside a single Docker container.

---

## Features

### Dashboard
- Live **device statistics** pulled from the Device Monitoring API (auto-refreshes every 30 seconds)
- **Tool health indicators** — per-tool online/offline/checking status badges (checked every 60 seconds, staggered 300 ms apart)
- **Uptime history** — 48-slot sparkbar on each live tool card showing recent availability
- **Categorised tool grid** — tools grouped by category with collapsible sections
- **Favourites** — pin any tool to the top by dragging it into the Favourites section
- **Drag-to-reorder** — reorder tiles within and across sections in Edit Layout mode
- **Search** — live filter across all tool titles, descriptions and categories
- **Announcement banner** — site-wide message posted by admins, dismissible per user
- **Light / Dark mode** toggle, persisted per user in localStorage
- Per-user layout state (order, favourites, collapsed sections, theme) stored in localStorage
- Saved tokens are re-verified on page load and cleared if expired

### Tools

Tools are server-managed rather than hardcoded. The auth service seeds a set of default tools on first boot (`default-tools.json`) and supports admin-created custom tools (`custom-tools.json`). Both sets are served to authenticated users at runtime.

Default seed tools:

| Tool | Category | Status |
|---|---|---|
| Device Surveyor | Discovery | Coming Soon (configurable) |
| Device Monitoring API | Discovery | Live |
| Nmap Monitor | Monitoring | Coming Soon (configurable) |
| Rundeck | Automation | Coming Soon |
| Rundeck Outputs | Automation | Coming Soon |
| Naming Tool | Utilities | Coming Soon |
| API Docs | Documentation | Coming Soon |

URLs for default tools can be set from the Manage Apps panel without redeploying.

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
- **Tool visibility** — admins can hide specific tools per user account. Hidden tools are stored server-side and applied on every login. Controlled via the collapsible **▸ Tool Visibility** panel on each user row

### App Manager (Admin only)
Accessed via the ⚙ settings menu → **Manage Apps**.

- **Default Apps** — edit details (title, icon, description, URL, badge, category) or delete any of the seeded default tools
- **Custom Apps** — add new tool entries, edit or delete existing ones. Tools without a URL appear as "Coming Soon"
- **Pending Tool Requests** — review requests submitted by users; approve (converts to a custom tool) or reject
- **Announcement Banner** — post, update, or clear a site-wide banner shown to all logged-in users

### Tool Requests (All users)
Any authenticated user can click **+ Request Tool** on the dashboard to suggest a new tool. Requests are queued server-side and reviewed by admins from the Manage Apps panel.

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
| `GET` | `/auth/default-tools` | Bearer | List all default tools |
| `PUT` | `/auth/default-tools/:id` | Admin | Update a default tool |
| `DELETE` | `/auth/default-tools/:id` | Admin | Delete a default tool |
| `GET` | `/auth/custom-tools` | Bearer | List all custom tools |
| `POST` | `/auth/custom-tools` | Admin | Create a custom tool |
| `PUT` | `/auth/custom-tools/:id` | Admin | Update a custom tool |
| `DELETE` | `/auth/custom-tools/:id` | Admin | Delete a custom tool |
| `GET` | `/auth/announcement` | Bearer | Get the current announcement |
| `PUT` | `/auth/announcement` | Admin | Set or update the announcement |
| `DELETE` | `/auth/announcement` | Admin | Clear the announcement |
| `POST` | `/auth/tool-requests` | Bearer | Submit a tool request |
| `GET` | `/auth/tool-requests` | Admin | List all pending tool requests |
| `PUT` | `/auth/tool-requests/:id/approve` | Admin | Approve a request (creates custom tool) |
| `DELETE` | `/auth/tool-requests/:id` | Admin | Reject / delete a request |

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

The `docker-compose.yml` references an external named volume (`shared-auth-data`) that must exist before first run:

```bash
docker volume create shared-auth-data
```

All server state (users, tools, requests, announcement) is persisted in this volume and survives container restarts and rebuilds.

---

## Project Structure

```
├── src/
│   ├── App.jsx               # Root — auth state, modal routing
│   ├── App.css
│   ├── tools.js              # Legacy tool definitions (superseded by server-managed tools)
│   ├── components/
│   │   ├── Dashboard.jsx     # Main dashboard — stats, tool grid, drag/drop, search
│   │   ├── Dashboard.css
│   │   ├── Login.jsx         # Login form
│   │   ├── UserManager.jsx   # Admin user management modal
│   │   ├── AppManager.jsx    # Admin app/tool management modal
│   │   ├── RequestToolModal.jsx  # User tool request form
│   │   ├── AnnouncementBanner.jsx  # Site-wide announcement strip
│   │   ├── ToolCard.jsx      # Individual tool tile
│   │   ├── ToolCard.css
│   │   ├── StatCard.jsx      # Overview stat tile
│   │   ├── StatCard.css
│   │   ├── Toast.jsx         # Notification toasts
│   │   └── Toast.css
│   └── index.css             # Global styles + component styles
├── auth-service/
│   ├── index.js              # Express JWT auth service
│   └── data/
│       ├── users.json        # Persisted user accounts
│       ├── default-tools.json    # Seeded default tools (editable at runtime)
│       ├── custom-tools.json     # Admin-created custom tools
│       ├── announcement.json     # Active announcement (if set)
│       └── tool-requests.json    # Pending tool requests
├── nginx.conf.template       # nginx config with auth_request gating
├── docker-entrypoint.sh      # Starts auth service then nginx
├── Dockerfile
└── docker-compose.yml
```
