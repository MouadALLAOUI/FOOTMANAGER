# AGENTS.md - Football Team Manager Platform

## 1. Project Overview & Scope
This platform connects managers from ~56 football teams to organize friendly ("amical") matches, view team leaderboards, and coordinate match times and stadiums (stades).
- Primary Language: Arabic (ar) by default with RTL layout (`dir="rtl"`).
- Target Clients: Web application fully responsive for both Mobile and Desktop.

## 2. Tech Stack & Tools
- Frontend: React (Vite) + Tailwind CSS + Lucide React + i18next
- Backend: Laravel API + Laravel Sanctum (Authentication)
- Database: PostgreSQL / MySQL
- Architecture: Decoupled API/Frontend setup

## 3. Core Features & Business Logic
1. Manager Approval Pipeline:
   - Managers sign up with registration requests -> Status defaults to `pending`.
   - Admin approves managers via Admin Dashboard -> Status changes to `approved`.
   - Middleware MUST check `status == 'approved'` before granting access to Manager features.
2. Multi-Role Permissions:
   - Roles: `admin`, `manager`.
   - Dashboard experiences are strictly isolated by role (`/admin/*` vs `/dashboard/*`).
3. Friendly Match Request System:
   - Approved managers can create a match request specifying `stadium_id`, `match_datetime`, and status (`open`).
   - Another approved manager can accept an open match request.
4. Leaderboard:
   - Public/Manager accessible leaderboard tracking points, matches played, wins, draws, losses.

## 4. Coding Standards & Conventions

### Frontend (React + Tailwind CSS)
- Directional Styling: Always use Tailwind logical utility classes (e.g., `ms-auto`, `pe-4`, `start-0`) instead of hardcoded directional utilities (`ml-auto`, `pr-4`, `left-0`) to support RTL natively.
- Component Design: Modular, atomic components placed inside `src/components/`.
- Dynamic Direction: Ensure root `<html>` tag dynamically reflects `dir="rtl"` when language is Arabic (`ar`).

### Backend (Laravel API)
- Controllers: Group by domain space (`Http/Controllers/Admin/`, `Http/Controllers/Manager/`, `Http/Controllers/Public/`).
- Database & Eloquent:
  - Table relationships: `users` (has one team), `teams` (has many match requests), `match_requests` (belongs to host team & opponent team).
  - Validation: Use explicit Form Requests for validation logic.
  - Return clean JSON REST responses with consistent HTTP status codes.

## 5. Extensibility & Future Rules
- Database tables and models should be designed cleanly for future add-ons (referee assignments, tournament trees, player statistics).
- Keep translation keys modularized inside i18n dictionary files under domain groups (e.g., `common`, `auth`, `match`, `dashboard`).
