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

## 6. Simple Frontend (`simpleFrontend/`) — New UX Rework Rules
This is a separate, fresh frontend reworked for illiterate users (icon-driven, simple, low-text UI). It must NOT touch the existing `frontend/` app.

### Project Structure
- Every page is a folder under `src/pages/` (e.g., `src/pages/landing/`).
- Every section of a page is a component, created inside that page's own folder (e.g., `src/pages/landing/hero.jsx`).
- Reusable, high-frequency components (buttons, inputs, modals, icons, etc.) live in `src/components/`.

### Workflow Rules (MANDATORY)
- Validate every update/change with the user before and after applying it.
- If anything is ambiguous or unclear, use a choice menu (question tool) to define it before proceeding.

## 7. Test Execution Rules
- DO NOT run any tests (backend `php artisan test` or otherwise) unless the user explicitly asks for them. Implement changes, then report what tests exist that could be run, and wait for user instruction.
- Long/slow tests (PHPUnit class style) MUST use the `Tests\Concerns\StreamsProgress` trait (`use StreamsProgress;`) and emit `$this->step()` / `$this->note()` / `$this->section()` lines at major intervals so progress prints live to STDERR without PHPUnit output buffering (works with `--testdox`). Silence with `LIVE_TEST_OUTPUT=0`.

## 8. Available Skills
- `customize-opencode`: Use when editing/creating opencode's own configuration (`opencode.json`, `.opencode/`, `~/.config/opencode/`, agents, subagents, skills, plugins, MCP servers, permissions).
- `find-skills`: Use to discover and install agent skills when the user wants new capabilities or asks "how do I do X".
- `frontend-design`: Use when building or styling web UI (pages, components, dashboards, landing pages, React components, HTML/CSS layouts) to produce distinctive, production-grade design.
- `git-workflow-agent`: Use for Git operations (branch creation, commit formatting, pushing to remotes).
- `laravel-best-practices`: Use when writing Laravel code (controllers, models, migrations, validation, services) to follow Laravel conventions.
