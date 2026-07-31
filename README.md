# ⚽ FootMANAGER

A full-stack football team management platform that connects football team managers to organize friendly ("amical") matches, send challenges, book terrains, track scores, and compete on a shared leaderboard.

The platform serves three audiences:

- **Managers** — create match requests, send/accept challenges, browse open matches, manage players, submit & confirm scores, book terrain slots, and view the leaderboard.
- **Terrain Owners** — manage their stadiums, working hours, weekly schedules, and approve/reject booking requests from a calendar dashboard.
- **Admin** — approves/rejects/blocks managers and terrain owners and monitors platform statistics.

> **Language:** Arabic by default with full RTL layout (`dir="rtl"`), with an English (LTR) locale available.

## ✨ Features

### Manager
- Register / log in with team profile (approval required before access)
- Create public match requests with stadium + date/time
- Send direct challenges to specific teams
- Accept or decline received challenges
- Browse the match feed and accept open matches
- Manage team players (CRUD)
- Submit match scores and confirm/dispute opponent scores
- View the platform leaderboard
- Browse and book terrain slots (one-time, weekly, training, private)

### Terrain Owner
- Create and manage terrains (photos, capacity, price, amenities)
- Set per-day working hours and weekly schedules
- Approve / reject booking requests
- Quick manual bookings from the calendar dashboard

### Admin
- Approve, reject, and block/unblock managers & terrain owners
- View platform statistics and user details

## 🛠 Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | React (Vite) + Tailwind CSS + Lucide React + i18next |
| Backend | Laravel API + Sanctum (token auth) |
| Database | MySQL / PostgreSQL (SQLite supported for dev) |
| Tooling | Composer, npm, Vite, Pint, oxlint |

## 📁 Architecture

```
FootMANAGER/
├── frontend/            # React SPA (Vite)
│   └── src/
│       ├── components/  # Atomic/modular components (Admin, Manager, Terrain, UI...)
│       ├── pages/       # Auth, Admin, Manager, TerrainOwner pages
│       ├── layouts/     # Per-role layouts
│       ├── context/     # AuthContext (token + user state)
│       ├── services/    # Axios instance
│       ├── locales/     # ar.json, en.json (i18n)
│       └── utils/       # dateFormatter, apiError...
└── backend/             # Laravel API
    └── app/
        ├── Http/Controllers/   # Auth, Admin, Manager, Public, Terrain
        ├── Http/Middleware/    # Role & approval guards
        ├── Http/Requests/      # Form Request validation
        ├── Models/             # User, Team, Stadium, MatchRequest, Player, TerrainBooking...
        ├── Services/           # CalendarSlotService, WhatsAppNotificationService
        └── Rules/              # NoOverlappingBooking
```

The API and frontend are **decoupled** and communicate over JSON REST endpoints.

## 🧑‍💼 Roles & Permissions

| Role | Status gate | Access |
| ---- | ----------- | ------ |
| `manager` | must be `approved` | `/dashboard/*`, `/manager/*` |
| `terrain_owner` | must be `approved` | `/owner/*`, `/terrain-owner/*` |
| `admin` | n/a | `/admin/*` |

Registration requests default to `pending` until an admin approves them.

## 🚀 Getting Started

### Prerequisites
- PHP ^8.2, Composer
- Node.js 18+, npm
- MySQL or PostgreSQL (SQLite works out of the box for dev)

### 1. Backend (Laravel API)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure your database in `.env` (e.g. `DB_CONNECTION=mysql`), then:

```bash
php artisan migrate --seed
php artisan serve   # http://localhost:8000
```

### 2. Frontend (React SPA)

```bash
cd frontend
npm install
npm run dev         # Vite dev server
```

The frontend calls `http://localhost:8000/api` by default. Override it with an env var:

```bash
# frontend/.env.local
VITE_API_URL=https://your-api-url.com/api
```

### 3. Local URLs
- Frontend: `http://localhost:5173`
- API: `http://localhost:8000/api`

## ✅ Available Scripts

### Backend
| Command | Description |
| ------- | ----------- |
| `php artisan serve` | Start the API server |
| `php artisan test` | Run backend tests |
| `./vendor/bin/pint` | Format code (Laravel Pint) |

### Frontend
| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint with oxlint |

## 📦 Database Schema (highlights)

| Table | Key fields |
| ----- | ---------- |
| `users` | name, email, phone, role, status |
| `teams` | name, manager_id, primary_stadium_id, points, wins/draws/losses |
| `stadiums` | name, city, owner_id, price, capacity, is_open |
| `terrain_schedules` | terrain_id, day_of_week, open_time, close_time, is_active |
| `terrain_bookings` | terrain_id, manager_id, team_id, booking_date, start_time, end_time, price, status |
| `match_requests` | host_team_id, opponent_team_id, stadium_id, match_datetime, status, score_status |
| `players` | team_id, name, position, number, phone |

## 🤝 Contributing

Contributions are welcome! Here is how you can help:

1. **Fork** the repository and create your branch from `main`.
2. **Set up** the project locally following the [Getting Started](#-getting-started) guide.
3. **Write code** following the project conventions:
   - Frontend: React + Tailwind, use logical CSS utilities (`ms-*`, `pe-*`, `start-*`) for RTL, keep i18n keys in both `ar.json` and `en.json`.
   - Backend: Laravel conventions — controllers grouped by domain (`Admin/`, `Manager/`, `Public/`, `Terrain/`), Form Request validation, clean JSON REST responses.
4. **Test** your changes:
   - `php artisan test`
   - `npm run lint` and `npm run build`
5. **Commit** with a clear message and open a **Pull Request** describing the change.

### Development Guidelines
- Keep translations modularized (domains: `common`, `auth`, `match`, `dashboard`, ...).
- Never commit secrets or `.env` files.
- Design database tables cleanly for future add-ons (referees, tournaments, player stats).

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
