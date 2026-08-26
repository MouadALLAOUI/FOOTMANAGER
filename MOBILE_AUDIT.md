# FootMANAGER Mobile Audit

**Date:** 2026-08-24
**Auditor:** Muse Spark (opencode)
**Workspace:** `C:\Users\mouad\Desktop\FootMANAGER`
**Scope:** Evidence-verified audit of `backend/` (Laravel 12, PHP 8.2, Sanctum 4) + `simpleFrontend/` (React 19, Vite 8, Tailwind 4) for React Native + Expo + TypeScript mobile roadmap. Obsolete `frontend/` excluded. ~310 API routes, 106 migrations, 103 controllers, 66 services, 195 page-files audited. No code modified.
**Legends:** Severity 🔴 Critical 🟠 Important 🟡 Medium 🟢 Low 🔵 Can Wait — Mobile suitability **A** Directly adaptable **B** Redesign required **C** Mobile-specific **D** Desktop-only — Evidence [V] verified [A] sub-agent cross-checked [X] checked OK

---

## 1. Executive Summary

FootMANAGER is a **6-role football ecosystem** (manager, terrain_owner, player, committee, admin, sub_admin) with **booking, amical match, tournament, social and subscription** domains. Backend is **mature and domain-driven** (~15 domains under `app/Domains/*`, 46 domain controllers + 57 Http controllers) but carries **critical mobile blockers**:

**What is ready for mobile:**
- Sanctum Bearer auth works for mobile (no cookies needed), 4 registration flows throttled (5/min), `GET /me` role detection, `PUT /me` profile + avatar works.
- All public `v1/*` endpoints are stateless JSON, CORS-enabled, paginated where needed (20/page on match-feed/leaderboard after 07-31 fix), suitable for offline caching.
- Booking conflict logic is sound in V1 `BookingService::confirm` (DB transaction + `lockForUpdate` on Stadium row) — correct pattern to replicate.
- Public landing data `GET /v1/home`, `/v1/stadiums`, `/v1/matches`, `/v1/leaderboard`, `/v1/stats` are mobile-ready (except API-1 bug).
- `simpleFrontend` card/list UI is already mobile-responsive (Tailwind `grid-cols-1 md:grid-cols-2`, logical `ms/pe/start`); public browsing and player/manager feed flows are **A**.

**What blocks mobile (must fix before Phase 1 launch):**
1. 🔴 **Tokens never expire** (`config/sanctum.php:53 expiration null`) — stolen token lives forever. `backend/config/sanctum.php:53` [V]. Needs 7-30d expiry + refresh/rotation.
2. 🔴 **Blocked users keep valid tokens** — `ManagerApprovalController.php:124-137` etc only flip `status` but no global guard on `auth:sanctum` reads (`routes/api.php:243-321`); blocked can still call `GET /me`, social writes, notifications. Also `activity_locked` does not revoke nor block login (`AuthController.php:69-112`).
3. 🔴 **`.env` ships with `APP_DEBUG=true` + `APP_KEY` exposed** (`backend/.env:3-4`) and `MAIL_MAILER=log` — stack traces leak in production.
4. 🔴 **PII leak on 3 public endpoints:** `StadiumDetailsResource.php:20-24` owner phone, `PlayerLeaderboardController.php:39` raw `user.phone/email`, `BookingController.php:101-110` manager phone in public `GET /terrains/{id}/slots` [V].
5. 🔴 **Chat transcript public + no membership** — `GET /v1/live/{match}/chat` unauthenticated (`routes/api.php:90`+`MatchChatController.php:24-39`), any approved user can post to any match [V].
6. 🔴 **No password reset / email verification** — `password_reset_tokens` table exists but zero routes/controllers; `email nullable` unverified; `login` accepts phone/email but duplicates allowed (`users.email` no unique).
7. 🟠 **Double-booking TOCTOU on legacy paths** — `createTrainingBooking`, `DirectBookingController::store`, `MatchFeedController::accept`, `MatchRequestController::store/respond` check then create without lock; only V1 confirm is safe. Weekly subscription lock misses DOW (`BookingController.php:231-242` locks by `start_date` not DOW).
8. 🟠 **`GET /v1/stats` double-wrapper breaks all stats UI** — backend returns `{data:{...}}` but `landing/liveStatus.jsx:40` + `matches/stats.jsx:23` read `r.data` → `undefined` → renders `…` [V].
9. 🟠 **Composer advisories 8 HIGH** — `guzzlehttp/guzzle` + `league/commonmark` DoS (verified `composer audit` in v2overview).

**Bottom line:** Reuse **95% of existing API as-is** for mobile. Do **not** rebuild. Required changes are **auth hardening (expiry + revocation + reset), PII scrubbing, chat gating, TOCTOU locks, and the 2-line stats fix**. Mobile needs **one new domain:** push notifications (FCM/APNs) + device token registration. The rest is UX translation, not backend rewrite.

---

## 2. Current Architecture

### 2.1 Stack

| Layer | Technology | Location |
|-------|------------|----------|
| Backend | Laravel 12 (PHP ^8.2), Sanctum 4, MySQL (`DB_DATABASE=footmanager`), `bacon-qr-code`, `dompdf`, `mpdf` | `backend/` |
| Frontend (active) | React 19.2.8, Vite 8, Tailwind 4, lucide-react, react-router-dom 7, `@tanstack/react-query` 5.101, axios 1.19, i18next 26, recharts 3 | `simpleFrontend/` |
| Frontend (obsolete) | React + Vite (old) — **ignore for mobile** | `frontend/` (do not use) |
| Auth | Sanctum Personal Access Tokens (`HasApiTokens` on `User.php:31`), Bearer `Authorization`, throttle `5,1` on auth | `backend/config/sanctum.php` |
| Locale | `APP_LOCALE=ar` RTL `dir="rtl"` (`simpleFrontend/src/App.jsx:40-42` sets `<html dir>`), fallback `en` | `backend/config/app.php`, `simpleFrontend/src/i18n.js` |
| Realtime | Polling (React Query `staleTime 60s`), no websockets | `simpleFrontend/src/api/queryClient.js:2` |

### 2.2 Project Structure (mobile-relevant)

```
FootMANAGER/
├── backend/                         # Laravel API (950-line routes/api.php ~310 routes)
│   ├── app/
│   │   ├── Http/Controllers/        # 57 files: Auth/, Admin/, Manager/, Player/, Committee/, Terrain/, Public/
│   │   ├── Domains/*/Controllers    # 46 files: Booking, Chat, Match, Team, Player, Tournament, Social, etc. (15 domains)
│   │   ├── Domains/*/Models         # 66+ models
│   │   ├── Domains/*/Services       # 66 services (centralized domain logic)
│   │   ├── Models/User.php          # 6 roles, 4 statuses, activity lock, SoftDeletes, permissions M2M
│   │   ├── Middleware/              # 11: EnsureIsAdmin/AdminAccess/ManagerApproved/.../ActivityNotLocked/ModuleMaintenance/Permission/AddSecurityHeaders
│   │   └── Http/Requests/           # 42 Form Requests (validation)
│   ├── database/migrations/         # 106 migrations → ~85 tables
│   ├── routes/api.php               # all routes, health /up + /api/health
│   ├── config/sanctum.php, cors.php # Bearer + CORS FRONTEND_URL
│   └── tests/Feature/*             # 22 test files (chat, tournament, live-match, social, subscription, security)
├── simpleFrontend/                  # Active SPA — basis for mobile feature parity
│   ├── src/App.jsx                  # 20 routes: 8 public + 4 auth + 5 dashboards (manager/terrain/admin/player/committee)
│   ├── src/pages/                   # 195 files: landing, fields, matches, tournaments, manager/*, terrain/*, player/*, committee/*, admin/*, auth/*, pricing/about/contact/terms/privacy
│   ├── src/api/client.js            # axios baseURL VITE_API_URL, Bearer auth_token, 401 redirect
│   ├── src/api/queries.js           # 47 query keys + useTypedQuery wrappers (stale 60s)
│   ├── src/context/AuthContext.jsx  # login/register/logout/refresh, localStorage auth_token/auth_user, usePermission
│   ├── src/components/              # ui, layout, dashboard, notifications, system/MaintenanceGate
│   ├── src/locales/ar.json, en.json # modular keys (common, shell, nav.*, analytics, admin.plans, player.*, etc.)
│   └── vercel.json                  # SPA rewrite
├── frontend/                        # OBSOLETE — do not reference
├── TODO.md, AUDIT.md, v2overview.md # partial/overlapping audits (superseded by this doc)
└── .env files                       # backend/.env (APP_DEBUG=true risk), simpleFrontend/.env (VITE_API_URL localhost)
```

### 2.3 Shared Resources

- **Images:** `Storage::disk('public')->url()` (`User.php:100`) — `public` disk; thumbnails via `ImageThumbnailService.php` (GD 400px). URLs are absolute (`http://host/storage/...`) — works from mobile if host reachable (see §15 localhost trap).
- **Config:** `config/cors.php:9 allowed_origins=[FRONTEND_URL]`, `supports_credentials=true`, `allowed_headers=*`. `sanctum.stateful` includes `SANCTUM_STATEFUL_DOMAINS`. `APP_LOCALE=ar`.
- **Deployment:** `nixpacks.toml`, `railway.toml`, `backend/public`, `vite.config.js`; no mobile CI yet.

---

## 3. Backend/API Inventory

**Total:** ~310 verb-routes + 1 `apiResource` in `routes/api.php:1-950` [V]. Base `api/`. Health `GET /up` (framework) + `GET /api/health` (`HealthController`). Method legend: pagination `paginate(20)`, throttle `throttle:5,1` on auth + `throttle:contact` on messages, `module.maintenance:*` gated, `activity.not_locked` on writes.

### 3.1 Authentication & Meta (public)

| # | Method | Route | Controller | Auth | Status |
|---|--------|-------|------------|------|--------|
| 1 | POST | `/api/register` | `Auth\AuthController@register` | none, throttle 5,1 | ✅ creates `manager` pending + `Team` (transaction) |
| 2 | POST | `/api/register-terrain-owner` | `AuthController@registerTerrainOwner` | none | ✅ `terrain_owner` pending |
| 3 | POST | `/api/register-player` | `AuthController@registerPlayer` | none | ✅ `player` pending + `PlayerProfile` |
| 4 | POST | `/api/register-committee` | `AuthController@registerCommittee` | none | ✅ `committee` pending |
| 5 | POST | `/api/login` | `AuthController@login` | none, throttle 5,1 | ✅ `login` (phone OR email) → `{user, token}` |
| 6 | POST | `/api/logout` | `AuthController@logout` | `auth:sanctum` | ✅ `currentAccessToken()->delete()` |
| 7 | GET | `/api/me` | `AuthController@me` | `auth:sanctum` | ✅ role-branching payload |
| 8 | PUT | `/api/me` | `AuthController@updateProfile` | `auth:sanctum` + not_locked | ✅ name/email/phone/is_whatsapp/password |
| 9 | POST | `/api/me/avatar` | `AuthController@uploadAvatar` | `auth:sanctum` + not_locked | ✅ image mimes 4096, thumb |
| 10 | DELETE | `/api/me/avatar` | `AuthController@removeAvatar` | same | ✅ |
| 11 | GET | `/api/me/subscription` | `MySubscriptionController@show` | `auth:sanctum` | ✅ current plan |
| 12 | POST | `/api/recovery/apply` | `AccountController@applyRecovery` | `auth:sanctum` (no approved check) | ✅ 64-char token |
| 13 | GET | `/api/health` | `HealthController` | none | ✅ `{status:ok, timestamp}` |
| 14 | GET | `/api/settings/public` | `SettingsController@publicSettings` | none | ⚠️ exposes settings — audit for secrets |
| 15 | GET | `/api/facilities` | `FacilityController@index` | none | ✅ |
| 16 | GET | `/api/cities`, `/cities/select`, `/cities/{city}` | `CityController` | none | ✅ city search |
| 17 | GET | `/api/stadiums` , `/terrains/public` , `/terrains/{id}/slots` | `StadiumController`, `BookingController@getTerrainSlots` | none | ⚠️ slots leaks manager phone [V] |
| 18 | GET | `/api/leaderboard`, `/leaderboard/players` | `LeaderboardController`, `PlayerLeaderboardController` | none | ⚠️ players leaks user PII [V] |

**Mobile:** All ✅ suitable (stateless, no cookies). Fix PII/slots before mobile.

### 3.2 Public `v1` (no auth, cacheable)

| Route | Controller | Notes | Mobile |
|-------|------------|-------|--------|
| `GET /v1/home` | `HomeController@index` | `{data:{latest_matches,top_stadiums}}` consumed as `r.data.data` [X] | ✅ |
| `GET /v1/plans` | `PlansController@index` | `{final_price}` with discounts | ✅ |
| `GET /v1/stadiums`, `GET /v1/stadiums/{stadium}` | `PublicStadiumController` | `?q,city,player_format,coverage,sort` | ⚠️ `owner.phone` leak [V] |
| `GET /v1/matches`, `GET /v1/live-matches` | `MatchController` | `{data,meta}` ok | ✅ |
| `GET /v1/leaderboard`, `GET /v1/stats` | `PublicLeaderboardController`, `StatsController` | leaderboard `{data:[{rank}],meta}` ok; **stats `{data:{...}}` double-wrapper breaks consumers** [V] | ⚠️ fix consumers |
| `GET /v1/live`, `GET /v1/live/{match}` | `LiveMatchController` | `GET /live/{match}/chat` **public no-auth** [V] | 🔴 gate |
| `GET /v1/teams/{team}/page` | `TeamPageController` | public team page | ✅ |
| `GET /v1/feed`, `GET /v1/comments`, `GET /v1/comments/{c}/replies`, `GET /v1/players/{p}/reviews`, `GET /v1/stadiums/{s}/reviews` | Social/Review | paginated | ✅ |
| `GET /v1/competitions/*` (5 routes) | `CompetitionController` | competitions/seasons/fixtures/standings | ✅ |
| `GET /v1/tournaments*` (13 routes incl fixtures/teams/draw/standings/bracket/statistics/news/gallery/sponsors/partners, matchDetail) | `PublicTournamentController` | tournament public surface | ✅ |
| `GET /v1/tournaments/{t}/registration` | `TournamentRegistrationController@availability` | public | ✅ |
| `GET/POST /v1/tournaments/{t}/contact/messages`, `GET/POST /v1/contact/messages`, `GET /v1/managers/{managerId}` | Contact | `throttle:contact` | ✅ |

### 3.3 Authenticated General (`auth:sanctum` + `user.approved`)

| Group | Routes | Mobile |
|-------|--------|--------|
| Bookings `v1/bookings` confirm/payment-intent/cancel (W) + history/upcoming/show/receipt (R), `module:bookings` | `V1BookingController` 7 routes | ✅ V1 confirm is **race-safe** (`lockForUpdate` on Stadium) — **pattern to reuse** |
| Notifications `GET /notifications`, `/unread-count`, `/preferences`, `/v1`, `PUT read/read-all/pin/important`, `DELETE`, `PUT preferences` (`module:notifications`) | `NotificationController` 9 routes | ✅ add push variant |
| Tournament me/register/destroy `v1/tournaments/{t}/registration/me|register|destroy` | `TournamentRegistrationController` 3 routes | ✅ |
| Social `v1/social/search*`, comments/reactions/follow/favorites (writes gated `activity.not_locked`, `module:social`) | `Search/Comment/Reaction/Follow/FavoriteController` ~18 routes | ✅ |
| Chat `v1/live/{match}/chat*`, `chat/messages/*` (`module:chat`) | `MatchChatController` 10 routes | ⚠️ gate reads + membership |
| Reviews `v1/players/{p}/reviews/{match}`, `v1/stadiums/{s}/reviews/{booking}` (W) | `PlayerReview/StadiumReviewController` 6 routes | ✅ |

### 3.4 Manager (`manager.approved` = role manager + approved)

| Group | Routes | Mobile |
|-------|--------|--------|
| `v1/manager/team` — show/put, logo/cover, gallery CRUD, statistics, fixtures, attendance, formation, captain/vice-captain, announcements CRUD, dashboard, players CRUD | `V1TeamProfile/TeamGallery/TeamStatistics/TeamFixture/V1Attendance/TeamFormation/Captain/TeamAnnouncement/TeamDashboard/V1PlayerController` 26 routes | ✅ gallery upload needs camera |
| `v1/live` — start/pause/resume/setMinute/finish/cancel/postpone, store/update/destroy events, updateStatistics/setLineup/setPerformance/awardMvp (`module:matches`+not_locked) | `LiveMatchController` 14 routes | ✅ live is mobile-critical; needs optimistic UI |
| Legacy `manager/*` — my-match-requests, received-challenges, store/sendChallenge/respond, destroy, match-feed+accept, start, pending-scores/confirmations, submit/confirm/dispute, applicants, lineup/roster/captain | `MatchRequest/MatchFeed/MatchResult/PlayerRecruit/ManagerLineupController` 18 routes | ⚠️ **non-V1 booking paths skip transaction** — fix TOCTOU before mobile |
| `manager/team-profile`, `manager/teams/{id}` | `TeamProfileController/PublicTeamController` | ✅ |
| `manager/players` CRUD, `manager/team-members*` (membership/essential/position) (`module:players`/`teams`) | `Player/TeamMembershipController` 9 routes | ✅ |
| `manager/bookings`, `manager/terrains/{id}/my-reservations`, `request-cancel`, `match-requests/from-booking`, `bookings/training`, `direct-bookings` (`module:bookings`) | `Booking/DirectBookingController` 6 routes | ⚠️ training/direct have TOCTOU |
| `manager/recruitment/search`, `recruitment/{p}/invite`, `recruitment/applications/{id}/respond` (`module:recruitment`) | `PlayerRecruitController` 3 routes | ✅ |
| `manager/tournaments`, `tournaments/{t}/register|cancel` (`module:tournaments`) | `ManagerTournamentController` 3 routes | ✅ |

### 3.5 Player (`player.approved`)

`v1/player`: profiles/{userId} public reads (leaderboard/gallery/career/achievements) + `player.approved` dashboard/profile (put/photo/cover/availability-status), gallery CRUD, statistics+sync, career/transfers, availability CRUD, achievements, performance (recent/heatmap/positions/best/form), settings, resources/events, security/password + sessions revoke, plus legacy `player/*`: profile/match-feed/matchDetail/applications/matches/stats/overview/my-team, apply/respond/cancel, team-requests. ~40 routes — all ✅ mobile suitable (profile photo = camera).

### 3.6 Terrain Owner (`terrain.owner`)

`owner/terrains` CRUD + images/cover, stats/overview/analytics, bookings upcoming, toggle-status/working-hours, `terrains/{id}/calendar?week`, `bookings/{id}/status|approve|reject`, guest-bookings, cancellation-requests, slot-closures index/store/destroy. 22 routes — **calendar fan-out is performance hotspot** (`bookingsData.js` ~180 reqs/page [A]) → needs aggregate endpoint for mobile.

### 3.7 Committee (`committee.approved`, `module:tournaments`)

`committee/teams`, `tournaments` index/store/show/update/destroy/open-registration/close-registration/start/cancel/progress, referees/team-players, `tournaments/{t}` scopedBindings: registrations approve/reject/markPaid, teams CRUD/free/bulk/group, stadiums, draw show/store/assign/save/destroy/confirm/unconfirm, fixtures index/preview/store/destroy/reschedule/postpone/cancel/restore + terrains/knockout-qualified/match-rounds, result store/update/destroy/show, events index/store/update/destroy, standings, bracket store/populate/sync, statistics, news/gallery/sponsors/partners (CRUD), contact/messages. ~70 routes — **D for mobile** (committee is desktop founder workflow; expose read-only standings/fixtures/bracket to mobile, hide orchestration).

### 3.8 Admin (`admin` vs `admin.access` + `permission:*`)

`admin/sub-admins` (pure admin), `admin/*` with `admin.access`: stats, managers/terrain-owners/players/committees (view → `users.view`, manage → `users.manage`), accounts delete/recovery (`users.accounts`), analytics/platform (`analytics.view`), activities (`activity.view`), settings/maintenance (`settings.view/manage`), contact-messages (`messages.*`), player-team-requests (`users.*`), moderation reports/hidden/resolve/hide/unhide/block/unblock (`moderation.*` + Gate `ReportPolicy` = admin-only even with permission), facilities (`facilities.*`), plans CRUD (`plans.*`). ~40 routes — **D** (admin is desktop console).

### 3.9 API Quality Assessment

| Dimension | Verdict |
|-----------|---------|
| Completeness | ✅ ~310 routes cover all 7 roles; dead dupes `non-v1 /leaderboard` flat vs `v1/leaderboard` paginated [A] — keep v1. |
| Inconsistency | 🟡 `v1/manager/team` vs legacy `manager/team-profile` duplicate team profile; `MatchRequest status` string(30) vs enum on `matches` vs `fixtures` string(20) [A]. |
| Broken | 🔴 `GET /v1/stats` wrapper mismatch, manager `DELETE /manager/bookings/{id}` dead route (`BookingsPanel.jsx:19` calls nonexistent [V] — should be `POST .../request-cancel`), GlobalSearch `search=` vs `q` param mismatch (`GlobalSearch.jsx:42` vs `StadiumQuery.php:24-31` [V]), Terrain `bookingsData.js` fan-out. |
| Pagination | ✅ Fixed on match-feed/leaderboard; remaining lists (social feed `paginate 20`, comments 20) ok; admin approvals paginated; player feed needs check. |
| Mobile suitability | ✅ 85% suitable as-is; 15% needs modification (PII, chat, TOCTOU, stats, localhost URLs). No web-specific session usage — Bearer-only works. |
| Missing for mobile | One push-notification device-token domain (FCM/APNs), `GET /v1/fields` slot filters for mobile date picker, `GET /me/refresh` token rotation, `POST /forgot-password` + `POST /reset-password`, `POST /devices` for push. |

---

## 4. Authentication & Security

### 4.1 Flows

| Flow | Route | File:Line | Detail |
|------|-------|-----------|--------|
| Register (manager) | `POST /register` | `AuthController.php:23-67`, `RegisterRequest.php:14-26` | `name, email unique, phone unique, password min:8, team_name, member_count, team_category adult/teenager/children` → transaction creates `User(role=manager,status=pending)+Team(visibility=private)`; throttle 5,1; gate `Setting::get('registration_open',true)`; mails all admins via `NewRegistrationMail`. Returns 201 with no token. |
| Register terrain_owner | `POST /register-terrain-owner` | `AuthController.php:285-319` | inline validate same + `role=terrain_owner pending` |
| Register player | `POST /register-player` | `AuthController.php:246-283`, `RegisterPlayerRequest.php` | + `PlayerProfile` |
| Register committee | `POST /register-committee` | `AuthController.php:322-357` | + `committee pending` |
| Login | `POST /login` | `AuthController.php:69-112` | body `{login: phone OR email, password}`; sequential `pending/rejected/blocked` → 403 Arabic; `activity_locked` **not checked** [V]; success creates `HasApiTokens` opaque `personal_access_tokens` row `createToken('auth_token')->plainTextToken`; returns `{user:userPayload, token}`. |
| Logout | `POST /logout` | `AuthController.php:114-121`, `routes:454` | `auth:sanctum` `currentAccessToken()->delete()` only current token; `SecurityController.php:53-68` allows revoke single/others under `v1/player/security/sessions/*`. |
| Me / role detection | `GET /me` | `AuthController.php:123-126,211-244` | `userPayload` includes `id,name,email,phone,role,status,is_whatsapp,avatar_url,avatar_thumbnail_url,activity_locked,activity_lock_reason,activity_locked_at` + `permissions` if sub_admin, `team` if manager, `terrains` if owner, `playerProfile` if player. **Frontend must call `/me` to detect role.** `PUT /me`, `POST/DELETE /me/avatar` for profile. |
| Recovery | `POST /recovery/apply` | `AccountController.php:110`, `AccountRecovery.php:46` | 64-char random, 2h expiry, no throttle (brute infeasible but add `throttle:5,1`). |
| Password reset / email verify | — | — | **NOT IMPLEMENTED** — `password_reset_tokens` migration exists but zero controller/routes; `MustVerifyEmail` absent; `email nullable` unverified [V][A]. `PUT /v1/player/security/password` (`SecurityController:16-35`) requires `current_password` — only authenticated password change. |

**Sanctum:** `config/sanctum.php:21-26` stateful domains `SANCTUM_STATEFUL_DOMAINS`, `guard=['web']` (bearer fallback), `expiration null` [V], `token_prefix ''`. `config/cors.php:9 allowed_origins=[FRONTEND_URL]`, `supports_credentials true`, `paths api/*`. `bootstrap/app.php:38 AddSecurityHeaders` globally.

**Mobile auth contract:** Bearer-only — mobile does `POST /login → store token in SecureStore → attach Authorization: Bearer <token> → GET /me → gate by role/status/activity_locked → on 401 clear + redirect to /login`. Works without cookies.

### 4.2 Account States

| Status | Values | Transition | Token revocation |
|--------|--------|------------|------------------|
| `status` | `pending` (default) → `approved`/`rejected`/`blocked` (`migrations/0001:15` + `2026_08_19_100000` adds `sub_admin` to role enum) | Admin `approve` → approved, `reject` → rejected + revoke, `block` → blocked + revoke, `unblock` → approved; bulk same (`ManagerApprovalController:95-151`, `PlayerApprovalController`, `CommitteeApprovalController`, `ModerationController:151-159`) | ✅ `revokeTokens()` on reject/block single+bulk; unblock/approve keeps [V]. **Gap:** `lockActivity` (`AccountController:157-189`) soft-locks without revoke — intended read-only but login still succeeds. |
| `activity_locked` | boolean + `activity_lock_reason/by/at` (`2026_08_19_110000`) | `PUT /admin/accounts/{id}/lock-activity|unlock-activity` (`permission:users.manage`) | ❌ no revoke on lock; `EnsureActivityNotLocked:19-21` bypasses admin; `EnsureNotLocked` only on write groups (`activity.not_locked` middleware) — reads remain. |
| Maintenance | `maintenance_modules` + `page_maintenance` (cache 120s, `block_reads` flag) | `PUT /admin/maintenance-modules/{m}` (`settings.manage`) | Bypass admin/sub_admin with `settings.view` (`EnsureModuleMaintenance:57`). |

### 4.3 Security Findings for Mobile

| # | Severity | Finding | File:Line | Mobile fix |
|---|----------|---------|-----------|------------|
| S-1 | 🔴 Critical | **Never-expiring tokens**: `sanctum.expiration null` [V]. Stolen token valid forever. `personal_access_tokens` has no `expires_at`. | `config/sanctum.php:53` | Set `expiration => 60*24*7` (7d) or `60*24*30`; implement `refresh` (rotate) on password change / `updatePassword` delete others; mobile SecureStore with expiry listener. |
| S-2 | 🔴 Critical | **Blocked/pending retain valid tokens for read routes**: `auth:sanctum`-only groups (`/me`, `/notifications`, `v1/bookings/history`, social reads) lack approved guard; blocked can read. | `routes/api.php:453-465` | Add global `EnsureUserApproved` or per-group `user.approved` to all authenticated reads; revoke on `lockActivity` if strict. |
| S-3 | 🔴 Critical | **`.env` ships `APP_DEBUG=true` + `APP_KEY` + `MAIL_LOG`** [V]; stack traces leak; CORS defaults to `http://localhost:5173`. | `backend/.env:3-4,46` | `APP_DEBUG=false` in prod, remove `.env` from repo (gitignore), set `FRONTEND_URL=https://...` prod, `SESSION_ENCRYPT=true` not needed for bearer but set. |
| S-4 | 🔴 Critical | **PII leak 3 endpoints** (owner phone, raw player leaderboard, slots manager phone) [V] | `StadiumDetailsResource:20-24`, `PlayerLeaderboardController:39`, `BookingController:101-110` | Resource allow-lists; phone only to owner/booking manager via policy. |
| S-5 | 🔴 Critical | **Chat public + no membership** [V] | `MatchChatController:24-39`, `MatchChatPolicy` | Gate `GET /live/{match}/chat` with `auth:sanctum` + `MatchChatPolicy::view` membership; `send/mute` enforce `match.home/away_team membership`. |
| S-6 | 🔴 Critical | **No password reset / email verify**; phone `nullable` no unique on update (verified hijack vector `AuthController:135 login by phone` [V]) | `AuthController:142-168`, `RegisterRequest:18` | Implement `POST /forgot-password` + `POST /reset-password` via broker, `unique:users,email,phone,<id>`, current-password gate already on `SecurityController` — extend to `PUT /me` email/phone change; add `Password::defaults()` min:12. |
| S-7 | 🟠 Important | **XSS via localStorage token** — `simpleFrontend/src/api/client.js:11` stores `auth_token` in localStorage. No HttpOnly cookie offer. | `client.js:11`, `AuthContext.jsx:20` | Mobile **must use Expo SecureStore** (not AsyncStorage) + `expo-secure-store`; web already mitigated by CSP `default-src 'none'` (`AddSecurityHeaders:24`) but still store safely. |
| S-8 | 🟠 Important | **IDOR potential**: `LiveMatchController:129-140 setLineup/setStatistics/setPerformance/awardMvp` validate `exists:teams,players` but not `team_id ∈ {match.home,match.away}`; admin bulk `AccountController:17 findOrFail without scope`. | `LiveMatchController`, `AccountController` | Add `team_id ∈ match` + `player_id ∈ team squad` validation; scope account ops by `role != admin`. |
| S-9 | 🟢 Low | **Throttling per-IP not per-account** on login; `recovery/apply` no throttle; `like %{$search}%` wildcard | `routes:109-113` | Add `throttle:account` or `RateLimiter::for('login')` per email/phone; throttle recovery `5,1`. |
| S-10 | 🟢 Low | **No security headers on storage images**; SVG already disallowed (no stored-XSS), random names, MIME validated | `AuthController:162` | OK — keep. |

**How React Native should authenticate (today, before fixes):**
`POST /login` (phone OR email) → persist `token` in `expo-secure-store` + `user` in SecureStore/mmkv → `api` interceptor adds `Authorization: Bearer` → `GET /me` to confirm `status===approved` AND `activity_locked===false` else force logout + show pending/blocked screen → 401 interceptor clears SecureStore + navigates to `/login`. **After fixes:** same plus `POST /refresh` rotation, `POST /forgot-password`, `DELETE /devices` revoke, and honor `expires_at` (re-login when 401).

---

## 5. Roles & Permissions

### 5.1 Roles (enum `users.role`, migration `0001:14` + `2026_08_19_100000:12`)

| Role | Purpose | Approval | Dashboard prefix | Created via |
|------|---------|----------|----------------|-------------|
| `admin` | Super-admin, bypasses all permission checks (`User::hasPermission` returns true [V]) | `approved` (seeder `AdminSeeder`) | `/admin/*` | seeder only |
| `sub_admin` | Granular permissions M2M `user_permissions` | `approved` | `/admin/*` filtered by `usePermission` | `POST /admin/sub-admins` (admin only) |
| `manager` | Team owner, creates `Team` on register | **pending→approved** pipeline | `/dashboard/*` | `POST /register` |
| `terrain_owner` | Stadium owner (`User→Stadium owner_id`) | pending→approved | `/terrain/*` | `POST /register-terrain-owner` |
| `player` | Stand-alone athlete (`PlayerProfile`, `PlayerAvailabilitySlot`, gallery) | pending→approved | `/player/*` | `POST /register-player` |
| `committee` | Tournament organizer (`Tournament organizer_id`) | pending→approved | `/committee/*` | `POST /register-committee` |

Helper `User.php:180-259 isAdmin/isSubAdmin/hasAdminAccess/isManager/isPlayer/isTerrainOwner/isCommittee/isApproved`.

### 5.2 Permission Matrix (real enforcement, not invented)

| Feature | Guest | Player (approved) | Manager | Terrain Owner | Committee | sub_admin* | Admin |
|---------|-------|-------------------|---------|---------------|-----------|------------|-------|
| Browse `v1/stadiums`, `v1/matches`, `v1/leaderboard`, `v1/tournaments`, `v1/home` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Register (any role) | ✓ | — | — | — | — | — | — |
| Login / recovery apply | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /me`, avatar, subscription | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `PUT /me` (profile) | — | ✓ (not_locked) | ✓ (not_locked) | ✓ (not_locked) | ✓ (not_locked) | ✓ | ✓ |
| Book `v1/bookings/confirm` etc. + legacy manager bookings | — | ✗ (policy blocks) | ✓ (user.approved+bookings) | — | — | — | ✓ |
| Create match request / challenge / accept feed | — | — | ✓ (matches) | — | — | — | — |
| Submit/confirm/dispute score | — | — | ✓ | — | — | — | — |
| Manage `v1/manager/team` (profile/logo/players/formation/captain/announcements) | — | — | ✓ (teams) | — | — | — | ✓ |
| Live control `v1/live/*` | — | — | ✓ (matches) | — | — | — | ✓ |
| Player domain `v1/player/*` | — | ✓ (players) | — | — | — | — | ✓ |
| Tournament register `v1/tournaments/{t}/registration` | — | ✓/manager | ✓ | ✓ | — | — | ✓ |
| Terrain CRUD + calendar + bookings + closures | — | — | — | ✓ | — | — | ✓ |
| Committee tournament orchestration `committee/*` | — | — | — | — | ✓ | — | ✓ |
| Admin `GET /admin/stats,managers,.../players,committees` | — | — | — | — | — | `users.view` | ✓ |
| Admin approve/reject/block/unblock + bulk + lockActivity | — | — | — | — | — | `users.manage` | ✓ |
| Admin delete/generate recovery | — | — | — | — | — | `users.accounts` | ✓ |
| Admin facilities | — | — | — | — | — | `facilities.*` | ✓ |
| Admin plans | — | — | — | — | — | `plans.*` | ✓ |
| Admin analytics | — | — | — | — | — | `analytics.view` | ✓ |
| Admin moderation block user | — | — | — | — | — | ✗ Gate `ReportPolicy@moderate` requires `isAdmin()` even with permission | ✓ admin-only |
| Notifications, social writes, chat reads, reviews | — | ✓ (user.approved) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /admin/sub-admins` CRUD | — | — | — | — | — | ✗ (pure `admin` middleware) | ✓ admin-only |

\* `sub_admin` has 16 slugs `PermissionSeeder:12-28 users.view/manage/accounts, analytics.view, settings.view/manage, messages.view/manage, moderation.view/manage (but Gate blocks), facilities.view/manage, plans.view/manage, activity.view, admin.manage` [V]; `EnsurePermission:11-24` OR check.

**Middleware mapping** (`bootstrap/app.php:38-51`): `admin` (`EnsureIsAdmin`: role admin && approved), `admin.access` (`EnsureAdminAccess`: admin||sub_admin && approved), `manager.approved`, `player.approved`, `terrain.owner`, `committee.approved`, `user.approved` (any approved), `activity.not_locked` (blocks if `activity_locked && !isAdmin()`), `module.maintenance:*`, `permission:*`.

**Critical nuance for mobile:** Generic `user.approved` routes (bookings/social/chat/reviews/notifications) allow **any approved role** to hit them, but policies like `TerrainBookingPolicy::create` restrict to manager — middleware alone not enough, always check `403 is_terrain_owner` etc. in error handling.

---

## 6. Frontend Feature Inventory (`simpleFrontend/`)

**Routes:** 20 entry routes in `src/App.jsx:1-84` [V] (lazy + Suspense + ErrorBoundary + MaintenanceGate + PageMaintenanceGate, `dir` sync). 48 routable subpages, 195 page-files, 110 components [A]. All pages ✅ implemented (no TODO stubs in `src/pages/**` [A]).

| # | Route | File (lazy) | Role | API (`api/queries.js`) | Status | Mobile |
|---|-------|-------------|------|------------------------|--------|--------|
| 1 | `/` | `pages/landing/index.jsx` 8 sections | public | `GET /v1/home`, `GET /v1/stadiums` adapters `toStadiumCard/toMatchCard` | ✅ | **A** |
| 2 | `/about` | `pages/about/index.jsx` 10 sections | public | static | ✅ | **A** |
| 3 | `/contact` | `pages/contact/form.jsx` | public | `POST /contact/messages` | ✅ | **A** |
| 4 | `/terms`, `/privacy` | `pages/terms`, `privacy` hero+toc+sections | public | `content/terms/{ar,en}.js` | ✅ | **A** (fix TOC scroll [TODO]) |
| 5 | `/pricing` | `pages/pricing/index.jsx` | public | `GET /v1/plans` + `GET /me/subscription` if authed | ✅ hero+comparison+payments | **A** |
| 6 | `/fields` | `pages/fields/index.jsx` | public | `GET /v1/stadiums` (city, format, coverage, sort, page), `GET /cities/select`, `BookingModal→POST /bookings/confirm` | ✅ Grid+Pagination+FilterToolbar | **A** |
| 7 | `/matches` | `pages/matches/index.jsx` | public | `GET /v1/matches`, `GET /v1/live-matches`, `GET /v1/leaderboard`, `GET /v1/stats` | ✅ hero|live|leaderboard|teamCard | **A** (fix stats wrapper) |
| 8 | `/tournaments` | `pages/tournaments/index.jsx` | public | `GET /v1/tournaments?per_page=24` | ✅ list | **A** |
| 9 | `/tournaments/:slug` | `pages/tournaments/detail.jsx` 10 sections +3 modals | public | `GET /v1/tournaments/{slug}` + fixtures/scorers/teams/gallery | ✅ | **B** tables+anchor nav → tabs |
| 10 | `/login` | `pages/auth/login/index.jsx` | guest | `POST /login` | ✅ promoPanel+loginForm | **A** |
| 11 | `/register` | `pages/auth/register/index.jsx` | guest | `POST /register*` role-conditional | ✅ | **A** |
| 12 | `/pending` | `pages/auth/pending` | pending | `GET /me` | ✅ | **A** |
| 13 | `/recovery` | `pages/auth/recovery/index.jsx` | guest | `POST /recovery/apply` | ✅ | **A** |
| 14 | `/dashboard/*` shell 7 items | `pages/manager/index.jsx:64` brand `nav.manager.brand` | manager | see below | ✅ | **B/C** |
| 15 | `/terrain/*` shell 7+4 QAs | `pages/terrain/index.jsx:64` | terrain_owner | see below | ✅ | **B/C** |
| 16 | `/admin/*` 5 groups, permission-filtered | `pages/admin/index.jsx:129` | admin/sub_admin | see below | ✅ | **D** |
| 17 | `/player/*` shell 7 FA icons | `pages/player/index.jsx:71` | player | see below | ✅ | **A/B** |
| 18 | `/committee/*` shell 2 | `pages/committee/index.jsx:50` | committee | see below | ✅ | **B** |

**Manager subpages** (`pages/manager/**`):
- `/dashboard` overview → `q.teamProfile, q.matchFeed, q.bookings, q.players, q.recruitment` + `CommandCenterProvider` + `HeroHeader, TodayPanel, QuickBooking, MatchMarket, TeamManagement, PerformancePanel, BookingsPanel, RecruitmentPanel, ActivityFeed` +8 drawers (`CommandCenterDrawers`) + NotificationsPanel+GlobalSearch [V] — **B** (3-col→1-col ok, drawers → bottom-sheet).
- `/dashboard/analytics` → `GET /manager/analytics?range` + `RechartsCore` — **A** (stacked bars already responsive).
- `/dashboard/matches` → `q.matchRequests`, `POST /match-requests`, `q.matchLineup/Roster`, `q.applicants` + `MatchDetail/NewMatchModal/ScoreModal` — **B** (table→card).
- `/dashboard/feed` → `q.matchFeed`, `POST /challenges` — **A**.
- `/dashboard/recruitment` → `q.recruitment`, `POST /player-invites` — **A**.
- `/dashboard/team`, `/players`, `/bookings`, `/tournaments` (GET open_for_registration, POST register/DELETE), `/notifications`, `/settings` (notif prefs), `/profile` — all **A**.

**Terrain** (`pages/terrain/**`):
- `/terrain` overview → `q.ownerOverview`, `q.ownerOverviewAnalytics?mode` — **B**.
- `/terrain/analytics` → analytics — **A**.
- `/terrain/terrains` CRUD + `FacilitiesPicker`, `ImageGallery`, `WorkingHoursEditor` — **B** (hours grid needs compact mobile picker [TODO]).
- `/terrain/calendar` `useTerrainCalendar` + `terrainCalendarAdapter` + `CalendarGrid/Day/Event/Slot` — **B/C** (weekly grid → list + swipe; slot closure via Calendar click missed — TODO says make it tap empty slot).
- `/terrain/bookings` `q.ownerBookings` PATCH approve/reject + `OwnerBookingCard, BookingDrawer, GuestBookingModal` — **A**.
- `/terrain/closures`, `/cancellations` — **A**.

**Player** (`pages/player/**`): `/player` overview (`q.playerStats, q.playerProfile, q.playerMatches/Feed/notifications`), `/player/feed` `q.playerFeed POST apply`, `/player/matches/:matchId` `q.playerMatchDetail + q.publicManagerProfile` + `PositionGrid` — **B** (grid needs map overlay), `/player/applications`, `/requests` (`/player/team-requests`), `/player/matches`, `/player/team`, `/profile`, `/notifications`, `/settings` — **A**.

**Committee** (`pages/committee/**`): `/committee` overview, `/committee/tournaments` list+create, `/committee/tournaments/:id` router with tabs `overview/teams/draw/fixtures/standings/bracket/statistics/analytics/content(5)/communication/settings + MatchControlRoom`, draw `GroupColumn/TeamPool/TeamChip/drawLogic`, export — **B** for overview/fixtures/standings/bracket/analytics, **D** for draw orchestration/export (touch drag → **C**).

**Admin** (`pages/admin/**`): overview, analytics, managers/owners/players/committees, requests (`/admin/requests` team-formation), moderation, activities, messages, facilities, plans (5 editors), settings (Module/PageMaintenance), profile, sub-admins — all **D** (desktop ops; keep responsive but hide from mobile tab bar).

**Shared:** `src/components/ui` (Button/Input/Card/Badge/Spinner/Modal/Toast/ConfirmDialog etc.), `layout/AppLayout/DashboardLayout`, `dashboard/Shell/cards/charts/Drawer/ItemIcon`, `notifications/NotificationList/utils`, `pricing/PlanCard`, `public/BookingModal/MatchRequestModal`, `system/MaintenanceGate/PageSkeleton`, `tournaments/TournamentCard`, `api/queryClient` stale 60s gc 5m, `lib/adapters` (`toStadiumCard/toLeaderboardRow` etc.), `hooks/useApi/useDebounce/useSeo`, `i18n.js` RTL.

---

## 7. Domain Map

```
Authentication (pending→approved→blocked + activity_locked + maintenance)
    ↓
Users (6 roles, permissions M2M, avatar, SoftDeletes)
    ↓
┌─────────┬──────────┬──────────────┬────────────┐
↓         ↓          ↓              ↓            ↓
Teams   Stadiums  Players(Profile)  Committee  Subscriptions
│         │          │              │            │
│         ├─ TerrainSchedules (7-day, is_active, slot_duration)   Plans/Features/PlanFeatures/Discounts → Subscriptions
│         ├─ TerrainSlotClosures                  ↓
│         ├─ TerrainImages (cover, thumbnail)    Tournaments (group_mode, qualify_per_group)
│         └─ TerrainBookings (single|weekly, pending|approved|confirmed|cancelled|expired)  → TournamentTeams → Groups → Fixtures
│              │                                              → Rounds → Matches (live)
│              ├─ Payments (cash only today)       → MatchEvents/Statistics/Lineups/Performances/Media
│              ├─ CancellationPolicies/Requests    → TournamentNews/Gallery/Sponsors/Partners
│              └─ SlotAvailability (CONFLICT_STATUSES)
│
MatchRequests (host/target/opponent, stadium, datetime, type public_request|direct_challenge, status open/accepted/live/completed/cancelled, score_status none|pending_confirmation|confirmed|disputed)  ←→ FootballMatches (distinct live engine)
    ↓
Players (team_id, position, role starter/sub/reserve, is_essential) → TeamMatchPlayers, TeamFormations, TeamAnnouncements, Attendances
    ↓
Match Chat (MatchChatMessages/Reads/Mutes) + Social (Comments/Likes/Reactions/Follows/Favorites/Search) + Reviews (Player/Stadium)
    ↓
Notifications (app_notifications + notifications dual tables → 56 types, preferences) → Analytics (platform/team/terrain/tournament) → Activities → Reports/Moderation
```

**Core domains:** Auth→Users→Teams/Stadiums/Players → Bookings/Matches → Tournaments (orchestration). **Secondary:** Chat/Social/Reviews/Notifications. **Shared:** Cities, Facilities, Settings, Plans, Achievements, Galleries.

**Dependencies & risks:**
- **Circular:** `Team ↔ User (manager_id)` + `Player.user_id → User` + `PlayerProfile.user_id` — player user doubles as roster player; keep single source (`rosterPlayer` vs `playerProfile`) clear in mobile profile screen.
- **Critical path:** `TerrainSchedule → TerrainBooking → MatchRequest → MatchEvent → Standing` — any break blocks match lifecycle.
- **Cascade delete hazard:** `matches.home/away_team_id cascadeOnDelete` + `fixtures.host_team_id cascade` [A] — deleting a team wipes history. Mobile must never expose delete-team to manager; admin delete already guarded by `canBeDeleted()` but cascade remains.
- **Overlapping stat tables:** `player_match_stats` vs `team_match_players` vs `player_match_performances` [A] — mobile should read `player_match_performances` canonical.
- **Dual notifications:** `app_notifications` (custom title/body/is_read/is_pinned) + framework `notifications` (morph) [A] — mobile uses `app_notifications` via `GET /notifications` (correct).

---

## 8. Core User Workflows

### 8.1 Player `Login → Browse → Apply → Play`

```text
Login (phone/email) → GET /me (role=player, status check) → /player (overview stats+profile) 
→ /player/feed (GET /player/match-feed) → apply POST /player/matches/{id}/apply (+ message)
→ manager receives notification + sees applicants GET /manager/matches/{id}/applicants → invite/accept via PlayerRecruitController@respond
→ player GET /player/applications to track/cancel → on match day GET /player/matches/{id} lineup/roster
```
Screens: Login, Player Overview, Feed (MatchMarket-like cards), Apply modal, Applications list, MatchDetail (PositionGrid + ManagerProfileCard), Notifications. APIs: `Auth@login, GET /me, GET /player/profile, GET /player/match-feed, POST matches/{id}/apply, GET applications, PUT cancel/respond`. Validation: `PlayerMatchGuard isFull/hasTimeConflict` [A]; need `positions_needed` field. Failure: full → 422 isFull; conflict → 422 time conflict; pending still shown as discovery. Mobile: bottom-sheet for apply, push on invite accepted.

### 8.2 Manager `Login → Team → Match → Opponent → Result`

```text
Login → GET /me (manager approved) → /dashboard (CommandCenter: TodayPanel + MatchMarket + TeamManagement)
→ Create match POST /manager/match-requests (stadium/custom_terrain, match_datetime after:now, end_time, needs_players)
→ Check conflicts teamHasMatchConflict/teamHasPlayerConflict + slot via SlotAvailabilityService
→ Creates MatchRequest open + TerrainBooking pending (transaction)
→ Browse feed GET /manager/match-feed → accept POST /manager/match-requests/{id}/accept (locks row, creates opponent Booking pending)
OR Send challenge POST /manager/challenges (target_team_id) → opponent GET /manager/received-challenges → PUT respond (accept creates Booking)
→ Manage lineup PUT /manager/match-requests/{id}/lineup + captain + roster → on day start POST /manager/match-requests/{id}/start → live
→ Report score POST /manager/matches/{id}/submit-score (pending_confirmation → notif opponent) → opponent POST confirm-score (tx increments Team points/wins/etc + PlayerProfile rating) OR dispute
```
Screens: Dashboard overview, Matches (my requests), Feed, Recruitment (free players), Team profile, Players, Bookings, MatchMarket modal, Score modal. APIs: `manager/match-requests, challenges, match-feed, lineup, match-requests/{id}/start, matches/pending-scores, submit/confirm/dispute`. Failure: terrain closed 422 orphans request [V] (validate before insert); double-accept race mitigated by `lockForUpdate` on MatchRequest [X]. Mobile: native date/time picker (not default inputs [TODO]), TimesSelect dropdown showing empty slots.

### 8.3 Terrain Owner `Login → Manage → Calendar → Approve → Analytics`

```text
Login → GET /me (terrain_owner) → /terrain (overview stats + pending bookings) → /terrain/terrains CRUD
→ Set hours PUT /owner/terrains/{id}/working-hours (7-day H:i) → toggle open PUT /owner/terrains/{id}/toggle-status
→ Calendar GET /owner/terrains/{id}/calendar?week (weekly slots + bookings + closures)
→ Approve PUT /owner/bookings/{id}/approve (lock + conflict check) or reject → or create guest POST /owner/terrains/{id}/guest-bookings
→ Close slot POST /owner/terrains/{id}/slot-closures → analytics GET /owner/analytics/overview?mode
```
Screens: Terrain Overview, MyTerrains (FacilitiesPicker+ImageGallery+WorkingHoursEditor), CalendarGrid (multi-week), Bookings (OwnerBookingCard+BookingDrawer), Closures (ClosureDrawer), Analytics (RangeFilter+Recharts). APIs: `owner/terrains/*, working-hours, toggle-status, calendar, bookings/{id}/approve|reject, guest-bookings, slot-closures`. Failure: update hours ignoring future approved bookings outside window [A]; closure race (no lock) [A]; weekly lock DOW bug [A]. Mobile: swipe week, tap empty slot to close (per TODO), bottom timeline.

### 8.4 Committee `Tournament Lifecycle`

```text
Create POST /committee/tournaments (name,startDate, format, teams, groups, qualify) → structure build (TournamentSetupService)
→ Add teams POST /committee/tournaments/{t}/teams|free|bulk, markPaid
→ Draw POST /committee/tournaments/{t}/draw (auto or manual drag GroupColumn/TeamPool) → confirm POST draw/confirm (all assigned + capacity) → fixtures POST /fixtures (preview/store)
→ Reschedule/postpone/cancel/restore → result POST /fixtures/{f}/result → StandingsService → bracket POST /bracket/populate/sync
→ Content (news/gallery/sponsors/partners/branding) → publish
→ Public reads GET /v1/tournaments/{slug}/fixtures|standings|bracket|statistics|news|gallery
```
Screens: Committee Overview, Tournaments list, Detail 10-tab (teams/draw/fixtures/standings/bracket/statistics/analytics/content/communication/settings). Mobile: read-only fixtures/standings/bracket for players/managers (mobile **A**); orchestration drag/drop is **D** for mobile (keep desktop).

### 8.5 Admin `Approval Pipeline`

```text
GET /admin/stats → GET /admin/managers?status=pending&search= → PUT /admin/managers/{id}/approve|reject|block|unblock (+ bulk) → lockActivity/unlockActivity → facilities/plans/settings/activities/messages/moderation
```
Mobile: none (D). If exposed at all, read-only approvals with 401 fallback.

---

## 9. Booking System Audit

| Area | Implemented | Broken/Missing | Mobile Ideal |
|------|-------------|----------------|--------------|
| Working hours | ✅ 7-day `TerrainSchedule day_of_week, open_time, close_time, slot_duration_minutes=60, is_active` [V]; `OwnerTerrainController@updateWorkingHours` validates H:i | 🟡 update ignores future approved bookings outside new window; 🟡 `slot_duration` not per-terrain configurable beyond 60 | Mobile grid picker (compact), per-day switch |
| Slots | ✅ `CalendarSlotService:238 generateSlots(open,close,duration)` + `getSlotsForDate/Week`; `BookingController@getTerrainSlots` | 🟡 `ownerCreateGuestBooking` vs `getOwnerCalendar` fixture window drift (2h) [A]; `BookingService` ignores schedule/closure [A] | Native time-wheel, show only open times (TODO quick booking must) |
| Availability | ✅ `SlotAvailabilityService CONFLICT_STATUSES=['pending','confirmed','approved']`, `TerrainBooking::checkConflict` + `NoOverlappingBooking`, overlap `start<'end && end>'start` [V] | 🔴 `CONFLICT_STATUSES` includes `confirmed` but calendar queries only `pending|approved` → double-book [A]; weekly `where booking_date=date` vs DOW miss [A] | Single source; validate before insert |
| Conflicts / race | ✅ V1 `BookingService::confirm` uses `Stadium::lockForUpdate()` + `DB::transaction` [V]; `DirectBooking`, `OwnerBooking` also lock stadium/booking | 🔴 legacy `createTrainingBooking`, `DirectBooking::store`, `MatchFeed::accept`, `MatchRequest::store/respond` TOCTOU (check then create w/o lock) [A]; `SlotClosureController` no lock [A] | Wrap all in `DB::transaction + lockForUpdate(stadium row)` |
| Weekly subscriptions | ✅ `TerrainBooking isWeeklySubscription/coversDate`, DOW+start/end_date, price `price*weeks ceil(diffInWeeks)` [V] | 🟡 `ceil` overcharges when 0 weeks → 4× [A]; infinite `end_date=null` forever active [A]; `ExpirePending/CancelExpired` cron exists but not wired? | Date range picker, next-occurrence label (`displayDate`) |
| Cancellations | ✅ `CancellationPolicy refund% at hours_before`, `CancellationService` locks, `requestCancel` pending + push `cancellation_requested`, owner `handleCancellation` approve/reject [V] | 🟡 direct cancel paths (`OwnerBooking:183`, `Booking:534`) skip refund compute | Swipe cancel + reason, refund preview |
| Payments / receipts | ✅ `Payment cash` only (`CashPaymentProvider expires +30m`), `PaymentIntentService`, `ReceiptService` PDF+QR | ❌ no real gateway (CMI/MoPay) webhook, no status `initiated→succeeded`, `service_fee=0`, `expires_at=slotStart` should be `now+30m` [A] | In-app payment sheet later; today show cash + receipt download |
| Guest bookings | ✅ `ownerCreateGuestBooking` `manager_id=null` guest_* fields, approved directly | 🟡 key mismatch `id|date` vs `booking_date` in `bookingsData.js` | Mobile guest form (name/phone) |
| Notifications | ✅ booking_* types (new_request, confirmation, rejection, approved, requested) | 🟡 WhatsApp mojibake `O�` encoding [A]; only wa.me link | Push + in-app |
| History | ✅ `v1/bookings/history|upcoming|show|receipt` (`dompdf/mpdf`) | 🟡 receipt not fronted | Receipt download via `expo-sharing` |

**Mobile booking flow (recommended):** Fields list → Terrain detail (images, facilities, maps) → Date picker → Fetch `GET /terrains/{id}/slots?date=` (also show V1 `GET /v1/bookings/upcoming` to avoid conflict) → TimesSelect (only `is_available` slots) → Duration/format → Confirm `POST /v1/bookings/confirm` (lock-safe) → Payment intent `POST /v1/bookings/{id}/payment-intent` (stub cash today) → Success + Notification + Calendar entry. Handle weekly via start/end + DOW checkboxes.

---

## 10. Match Audit

| Area | Implemented | Broken/Missing | Mobile |
|------|-------------|----------------|--------|
| Creation | ✅ `MatchRequestController@store` validates `stadium/custom_terrain, match_datetime after:now, end_time via Setting default_match_hours`, checks `MatchMembershipService teamHasMatchConflict/teamHasPlayerConflict`, tx creates `MatchRequest open + TerrainBooking pending` with fixture 2h check [V] | 🟡 orphan if terrain closed after insert (`MatchRequest created @95 then 422 @107`) [A]; `getConflictMessage excludeManagerId=user.id` allows self double-book [A] | Native date+TimesSelect, `NeedPlayersField` for positions_needed |
| Direct challenge | ✅ `sendChallenge` + `respondToChallenge` lock row, re-check conflict+fixture, creates opponent Booking pending [V] | 🟡 no limit check on send; limit check outside tx on respond race [A] | Swipe accept/decline, push |
| Feed accept | ✅ `MatchFeedController@accept` paginated 20, locks `MatchRequest` [X] | 🟡 legacy path still TOCTOU on terrain lock (weekly DOW) | Card feed virtualized |
| From booking | ✅ `createFromBooking` locks Booking + links `match_request_id` | 🟡 DOW validation only weekly subset [A] | One-tap convert |
| Live | ✅ Dual model `MatchRequest (amical)` + `FootballMatch (structured)`; `LiveMatchController start/pause/resume/setMinute/finish/cancel/postpone` via `LiveMatchService`, `storeEvent` validates goal types, `MatchEventService applyScore/updateStatistic` fires `GoalScored/CardGiven`, lineup/performance/mvp guarded [V] | 🟡 minute 0-130 no monotonic; `record` not locking match [A]; parallel state machines not synced | Real-time poll (`refetchInterval 10s`) + optimistic minute, event timeline, mvp badge |
| Scores | ✅ `MatchResultController pendingScores/pendingConfirmations, submitScore (1h past check), confirmScore (tx increments Team points + PlayerProfile rating for mercenary), dispute` [V]; cache flush `PublicCache::flushTeamLeaderboard` | 🟡 `mercenary_player_id` rating only; `needs_players` multi not credited; `max:99` not enforced (1000-0 possible) [A]; confirm not re-checking 1h | Score sheet bottom-sheet, photo proof future |
| Need-players | ✅ `match_requests.needs_players`, `player_match_requests position`, pricing per player | 🟡 market `isFull` vs `players_joined` drift, empty positions not shown to player | PositionGrid + price per player |
| Tournament matches | via `TournamentFixture/Match` (separate) — see §12 | — | Read-only |

**Mobile-specific:** Push on `goal_scored/live_match_started`, deep link `/live/{match}`; lineup `formation` editor is **B/C** (FIFA-like drag-drop planned far future [TODO] → mobile needs 5v5/7v7 preset grids, not free drag).

---

## 11. Team Audit

| Area | Implemented | Broken | Missing |
|------|-------------|--------|---------|
| Creation | ✅ `register` tx creates `User(manager) + Team(private)` [V]; `AdminPlayerTeamRequestController` handles `player_team_requests` approve→Team | `member_count` never incremented [A]; `visibility` string unchecked [A] | Bulk create from CSV |
| Players | ✅ `Player model team_id/user_id/position/role starter|sub|reserve/status, is_essential`; `PlayerController store/update/destroy`, `TeamMembershipController addMember/removeMember/toggleEssential/changePosition`, `roster` relation | `max_squad_size` never enforced [A]; `Player.user_id` duplicate no unique [A]; `removeCaptain` stale `formation.captain_id` [A]; `is_essential` recent migration not fronted fully | `PlayerTransfer/PlayerTeamHistory` wiring |
| Captaincy | ✅ `CaptainService asserts team_id, swaps other role null, syncs TeamFormation` + policy `ownsTeam` | — | Free-kick taker wiring (`setFreeKickTaker` exists but UI minimal) |
| Profile | ✅ `V1TeamProfile update`, `uploadLogo/cover`, `TeamGallery` (reorder/cover), `TeamAnnouncement`/`Attendance`/`TeamFormation` | `TeamPolicy::before admin bypass` ok; cover thumbnail fallback silent [A] | Formation `update` version history |
| Stats/Fixtures | ✅ `TeamStatistics`, `TeamFixture upcoming/history`, `TeamDashboard` + leaderboard `PublicCache` | — | — |

**Mobile:** Team profile with logo/cover upload (camera, 4MB `mimes jpeg/png/jpg/webp` [V]), gallery swipe, member list with `is_essential` toggle, position wheel, captain badge; formation presets 5v5/7v7 (far future drag-drop → mobile preset selector first) — **B/C**.

---

## 12. Tournament Audit

| Area | Implemented | Status | Mobile |
|------|-------------|--------|--------|
| Creation/settings | ✅ `Tournament model group_mode fixed|free, teams_per_group, qualify_per_group`, `TournamentSetupService::buildStructure`, `TournamentController index/store/show/update/destroy/openRegistration/closeRegistration/start/cancel` + branding/contact | ✅ | **D** (create is committee desktop) |
| Registration | ✅ `TournamentRegistrationService`, `TournamentTeam` pivot, `approve/reject/markPaid`, subscription `tournament_limit` check [V]; `availability/me/register/destroy` public | ✅ | **A** manager register/cancel |
| Free teams | ✅ `storeFree`, `storeBulkFree` [TODO bulk already done but committee asks bulk btn] | ✅ | D |
| Draw | ✅ `TournamentDrawService autoDraw/shuffle, assignTeam (capacity + ensureFreeNextGroup for free mode), saveDraw bulk, confirm/unconfirm`, all `DB::transaction + assertNotConfirmed` [V] | 🟡 `autoDraw` instant confirm leaves no review [A]; cache not flushed | **D/C** drag is desktop; mobile read-only |
| Fixtures | ✅ `TournamentFixtureService`, `Fixture source_home_fixture_id` bracket, `TournamentFixtureController preview/store/destroy/reschedule/postpone/cancel/restore` + terrains/knockout-qualified/match-rounds | 🟡 fixture vs Booking 2h window double-count not shared constant [A] | **B** list→card |
| Results/events | ✅ `TournamentResultService`, `TournamentMatchEventController store/update/destroy`, guards | 🟡 `progress` stage blocked until previous round done even if done (TODO bug) | **B** score sheet |
| Standings/scorers | ✅ `Standing` + `StandingsService`, public `standings/statistics` | ✅ | **A** |
| Bracket | ✅ `TournamentBracketService populate/sync` | 🟡 auto-pop on group finish missing [A] | **B** horizontal scroll |
| Content | ✅ `TournamentNews/Gallery/Sponsors/Partners/Branding/Contact` CRUD | 🟡 `content order input` meaningless, `publish date` should default now [TODO]; sponsors modal not closing [TODO] | **A** (gallery/news) |
| Public landing | ✅ `PublicTournamentController` 13 routes + `matchDetail` + `contact/messages` | 🟡 news not showing on landing [TODO] | **A** |
| Publishing | `TournamentController::progress` stages `competition_created→knockout_ready` | ✅ | D |

**Relevance:** Mobile consumes **read-only** tournaments (list, fixtures, standings, bracket, gallery, news, sponsors) — all public `GET /v1/tournaments/*` already exist and are **A**. Management (draw/fixtures/content) stays desktop.

---

## 13. Analytics Audit

| Consumer | Endpoint | Metrics | Filters | Status |
|----------|----------|---------|---------|--------|
| Admin | `GET /admin/analytics/platform` `AnalyticsController:19 platform()` `MAX_RANGE 366`, `group_by hour/day/week/month`, cache 60s, summary+trends daily/hourlyCounts + bucketSeries | `stat users/teams/terrains/tournaments/matches/bookings/matchRequests/finished` + `trendsUsers(Activity)` hourly/daily | `range today/7d/30d/3m/year/custom, from/to` (`RangeFilter.jsx`) | 🟡 `hourlyCounts mapWithKeys(hour=>c)` collapses days [A] when multi-day range; today hourly ok |
| Terrain Owner | `GET /owner/analytics/overview?mode` `TerrainOwnerController:overviewAnalytics`, `GET /owner/analytics/details` `analyticsDetails`, `GET /owner/overview` `GET /owner/stats` | terrains count, bookings, revenue, upcoming (`bookingsData.js` fan-out) | mode (revenue/occupancy), week | 🔴 **fan-out 180 reqs/page** [A]; revenue hourly broken [TODO الإيرادات لا تظهر charts]; 2 of 5 TODO fields missing city dropdown etc. |
| Manager | `GET /manager/team/statistics`, `GET /v1/team/statistics` alias `TeamStatisticsController` | matches played, wins/draws/losses, GF/GA/GD, points, winRate, streak, highlights | `range` (custom hook) | 🟡 `/team/statistics` 404 bug fixed via alias `v1/team/statistics` |
| Committee | `GET /committee/tournaments/{t}/statistics` `TournamentStatisticsController` + analyticsTab | played/remaining, goals, avg, cards, group perf | — | ✅ |
| Player | `GET /v1/player/statistics`, `/performance/*` (recent/heatmap/positions/best/form) | rating, points, matches | — | ✅ read-only |

**Mobile:** Show **light** analytics only: manager win/loss + goals trend (already responsive Recharts), terrain **daily** revenue (not hourly unless `today` selected [TODO]), admin **D** (desktop). Add aggregate `GET /owner/analytics/summary?range=` to replace fan-out (backend dependency before mobile terrain analytics). Classification **B** for full dashboards.

---

## 14. Notification Audit

**Model:** `app_notifications` (custom `user_id, type(56), title, body, data json, action_url, is_read, is_pinned, is_important`) + `notifications` (framework morph) **dual tables — drift risk** [A] (`2026_07_28_000003` vs `2026_08_07_000014` both `create_notifications_table` [A] but no collision). Mobile uses `app_notifications`.

**Types (56, `NotificationService:14 CATEGORY_MAP 7`):** `challenge_received/accepted/declined`, `match_accepted/invitation/started/finished`, `goal_scored`, `live_match_started`, `score_submitted/confirmed/disputed`, `new_booking_request/booking_confirmation/cancellation/rejected/completed`, `reservation_approved/rejected`, `cancellation_requested/approved/rejected`, `player_application_received/accepted/declined`, `player_invite_received/accepted`, `team_formation_request`, `announcement`, `new_follower/new_comment/comment_reply/like`, `player_review/stadium_review`, `player_awarded_mvp`, `report`, `system` (56 total [V]).

**Triggers:** Services/listeners for bookings/match/social; respects `NotificationPreference` (`NotificationService:213 try/catch`).

**APIs:** `GET /notifications` paginated, `GET /unread-count` badge, `GET /preferences`, `GET /v1`, `PUT {id}/read`, `PUT read-all`, `PUT {id}/pin|important`, `DELETE {id}`, `PUT preferences` (all `user.approved + module:notifications` + `activity.not_locked` on writes) [V].

**Frontend:** `components/notifications/NotificationList/Item/Preferences` + per-role pages `/manager/notifications`, `/player/notifications`, `/terrain/notifications`, `/admin/notifications`, `/committee/notifications`; ar.json `notifications.types` sync [V]; `MaintenanceGate` counts.

**Bugs:** Committee receives `team_formation_request` that only admin should (TODO bug); manager `notification_on_match_accepted` missing? (ensure `match_accepted` pushed). **No dedup** [A].

**Mobile mapping:**

| Backend trigger | In-app | Push (FCM) | Email (future) |
|-----------------|--------|------------|----------------|
| match/challenge/score/player invite | ✅ in-app (priority) | ✅ push high priority | — |
| booking approved/rejected/cancel | ✅ | ✅ | — |
| tournament approve/fixtures | ✅ | ✅ | — |
| social (follow/comment) | ✅ | 🔔 preference (opt-in) | — |
| system/announcement | ✅ pinned | — | — |

**New need:** `POST /devices` (store FCM token) + `DELETE /devices/{id}` + background handler; extend `NotificationPreference` with `push_enabled` already present (`PlayerSettings` channels database/email/push/sms [V]) but `NotificationPreferenceService` only database.

---

## 15. File & Image Handling

| Asset | Storage | Validation | Thumbnail | Mobile |
|-------|---------|------------|-----------|--------|
| `User.avatar` | `storage/app/public/avatars/{uuid}.jpg`, `avatar_path` + `avatar_thumbnail_path` [V] `AuthController:154-183`, `ImageThumbnailService storeWithThumbnail` GD 400px jpg | `image mimes jpeg,png,jpg,webp max 4096 dimensions 64-5000` [V] | ✅ 400px | `avatar_url` absolute `Storage::disk('public')->url()` works if host is `https://api.yourdomain.com/storage/...`; **localhost `http://localhost:8000/storage` fails on device** — use `VITE_API_URL` prod host. |
| `Stadium` images | `terrain_images image_path`, `is_thumbnail` [V] `TerrainOwnerController:uploadImages`, max 6 claimed but not server-enforced [A] | `image mimes size cap`, random names, SVG blocked | `thumb` via `BackfillImageThumbnails` command | ✅ `fieldImage()` fallback; `setCover` exists |
| `Team` logo/cover | `Team.logo_path/cover_path` `V1TeamProfileController uploadLogo/cover` | same mimes | fallback returns original as thumb silently [A] | ✅ |
| Tournament gallery | `tournament_gallery_images` | same | — | ✅ news/gallery public |
| `Player` gallery | `player_gallery_images` `GalleryController` | same | — | ✅ |
| Receipt | `receipt_path` PDF+QR `ReceiptService:38 PDF+QR` | `dompdf/mpdf` | — | Download via `expo-sharing` from `GET /v1/bookings/{id}/receipt` |

**PPIs:** `ImageThumbnailService:29` no orphan cleanup on replace [A]; `Stadium:94-102` fallback hides missing thumb. **Permissions:** ownership checked (`terrain owner`, `manager ownsTeam`).

**Mobile URLs:** All `Storage::url()` returns absolute; dev `http://localhost:8000` unreachable from phone — document: mobile **must** use `EXPO_PUBLIC_API_URL=https://api.production/storage` (Railway/Vercel). Relative URLs none — ok. Private storage none — all public disk.

**New:** Add `multipart/form-data` upload progress, image compression via `expo-image-manipulator` (resize to 1080 before upload), camera `expo-image-picker`.

---

## 16. Location Audit

**Existing:**
- `City` model + `cities` table (`2026_08_12_000014/000015`), `CityController index/listForSelect/show` public, `Stadium.city` (string) + `city_id` FK [A][V] — drift risk (string vs id).
- `Stadium.google_maps_url` string (iframe embed on `TerrainDetail.jsx`) — no lat/lng columns.
- Frontend `fields/searchPanel` + `useCitiesSelect` merges API + derived terrains cities; `GlobalSearch` city filter works; no distance.
- No coordinates, no `nearest terrain`, no geofence, no `haversine`.

**Backend support:** City filter (`q=city`), no `lat`, `lng`, `radius`, `nearby`. `Stadiums.type` enum `minifoot/salle→cement` migration [A].

**Frontend:** No map SDK, just iframe; `WorkingHoursEditor` no location.

**Mobile recommendation:**
- Keep city **required** (dropdown from `GET /cities/select` — fix TODO city select).
- **Should request GPS?** 🔵 Optional for `Nearest` feature — propose `GET /v1/stadiums?lat&lng&radius=10` (new) with haversine; without it, fallback to city search (current). Permission `ACCESS_FINE_LOCATION` optional, not blocking.
- **Should remain optional:** yes — booking works by city name; add `google_maps_url` deep link to Maps app (`Linking.openURL`).
- **New columns (if funded):** `stadiums.lat/decimal(10,7), lng, address, google_place_id`; add `ST_Distance_Sphere` query; no breaking change.

---

## 17. Localization

**Supported:** `ar` (default RTL) + `en` LTR. `APP_LOCALE=ar`, `APP_FALLBACK_LOCALE=en` (`config/app.php`, `.env:7-8`). `simpleFrontend/src/i18n.js` + `locales/ar.json` (1,100+ lines) & `en.json` modular domains `common, stages, status, profile.avatar, shell, pagination, nav.*, teamRequests, notifications{+settings}, manager.analytics, admin.plans, player.* , committee.* , pricing, fieldsPage, auth, landing` [V]. `src/App.jsx:39-42` sets `documentElement.dir/lang` [V].

**Frontend i18n:** `useTranslation`, `i18next-browser-languagedetector`; hard-coded Arabic remains in dashboards bypassing i18n (`player/feed`, `BookingsPanel`, `ApprovalList`) [A][V] — extract before mobile.

**Backend localization:** Arabic messages in `AuthController` (`حسابك قيد المراجعة` etc), `TerrainBooking::getConflictMessage` mojibake `O�` encoding corrupted [A]; rest JSON English keys — not translated; mobile should show `getApiErrorMessage` mapping [V].

**RTL:** `dir="rtl"` when `ar`; Tailwind logical `ms-auto/pe-4/start-0` used per AGENTS.md 4; exception `terrain/calendar:121 ChevronRight rotate-180` hardcoded wrong in RTL [A], `md:divide-x` wrong edge [A].

**For React Native:**
- Use `i18next` + `expo-localization` + `I18nManager` (`isRTL`, `forceRTL` on ar, `allowRTL`);
- Store `locale` in mmkv; `RTL` layout via `react-native` flex `I18nManager`;
- Mirror `ar.json/en.json` keys (copy verbatim); add `Intl.DateTimeFormat` with `ar-MA`;
- Test `dir` on first launch (detect device locale fallback to `ar`).

---

## 18. Date & Time

**Canonical:** `config/app.php timezone UTC` [V]; stored as UTC `datetime` columns; frontend renders `Intl.DateTimeFormat ar-MA` (`bookings/index:28`). **Problem:** `AnalyticsController:44 UTC` vs bookings `now()` server local (Africa/Casablanca) drift — `isFuture()` `BookingService:55` may mis-evaluate [A].

**Formats:**
- API: `User::serializeDate Y-m-d\TH:i:s` (`User.php:76`) vs `match_datetime cast Y-m-d\TH:i` (missing seconds) mismatch [A].
- Times: string `H:i` (`terrain_schedules open_time/close_time`, closures `string(5)` [A] vs `time`) lexicographic overlap works but `SlotClosure string(5)` invalid [A].

**Pickers:**
- Manager overview/feed `TimePicker.jsx`, `TimesSelect.jsx`, `NeedPlayersField.jsx` exist but TODO says new match drawer still uses native date/time behind modal [TODO][TODO]; `MatchFeed` time picker behind modal [TODO].
- Weekly `day_of_week` (Carbon 0=Sun) aligns `CalendarSlotService:20` [V].

**Slot calc:** `generateSlots` inclusive start exclusive end correct; weekly DOW+range filtered; `ceil(diffInWeeks)` weeks pricing [A] overcharges.

**Timezone risk for mobile:** Device tz may be `Africa/Casablanca` vs server UTC — must **always send ISO8601 UTC** and render with `date-fns-tz`/`Intl` in device locale; never trust local `new Date()` without offset. Store `booking_date` date-only + `start_time` time-only separately — keep.

**Mobile rules:**
- Send `match_datetime` as UTC ISO (`YYYY-MM-DDTHH:mm:ssZ`); include `tz=Africa/Casablanca` header optionally;
- Use `expo-date-time-picker` native + `dayjs` utc;
- Display via `Intl.DateTimeFormat` with `timeZone: 'Africa/Casablanca'`;
- `available_slots` computed server-side already timezone-safe; just pass `date` param;
- Fix `BookingService expires_at=slotStart` → `now+30m` before mobile payment intent.

---

## 19. Performance Audit

| Issue | Severity | Location | Impact | Mobile fix |
|-------|----------|----------|--------|------------|
| Terrain overview fan-out 180 reqs/page | 🔴 Critical | `terrain/components/bookingsData.js` 7 weeks × terrains + 12×4-5× for revenue [A] | Slow + billing | New aggregate `GET /owner/analytics/summary` + `GET /owner/overview` already exists — switch mobile to it; cache |
| Missing pagination on large lists (feed, follow) | 🟠 Important | `MatchFeedController paginate(20)` fixed, leaderboard fixed, but social `whereHasMorph + LIKE` on `activities` [A] | Initial load | Use `?page&per_page`, `useInfiniteQuery`, virtual list `@tanstack/react-virtual` already in deps |
| Large API responses (public leaderboard raw User) | 🟠 Important | `PlayerLeaderboardController:39` raw models [V] | Over-fetch + PII | Resource with `rank` + pagination |
| N+1 on calendar `manager/team/terrain` eager missing | 🟠 Important | `BookingController getOwnerCalendar` needs `manager,team,terrain` eager [A] | Calendar lag | Add `with()` |
| Large images (no compression) | 🟢 Low | `terrain_images`, `logo` — GD thumb 400px but no WebP, no CDN | Bundle + data | Compress on device via `expo-image-manipulator` to 1080, server WebP, CDN |
| Duplicate `generateSlots` | 🟢 Low | Fixed 07-31 via service injection | Maintenance | Done |
| Heavy dashboard endpoints (CommandCenter 5 queries) | 🟢 Low | `manager/overview` 5 `useTypedQuery` parallel (`stale 60s`) [V] | First paint | Keep stale 60s, prioritize hero then defer |
| `Setting::get()` per request | 🟢 Low | `AuthController`, gallery per-call [A] | DB hits | Cache `Cache::remember` |
| Analytics hourly collapse | 🟡 Medium | `AnalyticsController hourlyCounts mapWithKeys` collapses days | Wrong charts | Fix `groupBy hour+date` or restrict hourly to single-day range |

---

## 20. Mobile-Specific Requirements

| Capability | Existing | Gap | Mobile implementation |
|------------|----------|-----|-----------------------|
| **Push notifications** | In-app DB only; no FCM/APNs | `POST /devices` missing, `NotificationPreference push_enabled` exists but not wired | `expo-notifications` + FCM (Android) + APNs (iOS); `POST /api/devices {fcm_token, platform}` + `DELETE`; backend `NotificationService` push channel via Firebase Admin SDK; foreground handler + badge `GET /notifications/unread-count`. |
| **Camera / Gallery** | File input web | No mobile picker | `expo-image-picker` (camera+library) + `expo-image-manipulator` (compress), same `POST /me/avatar`, `/v1/manager/team/logo`, `/owner/terrains/{id}/images`. |
| **Location / Maps** | city string + google_maps_url iframe | No lat/lng/distance | `expo-location` (optional permission), `react-native-maps` or `Linking.openURL(google_maps_url)`; optional `nearby` sort. |
| **Biometric login** | password only | no `biometry` | `expo-local-authentication` to unlock SecureStore token; fallback password. |
| **Deep links** | web routes `/tournaments/:slug`, `/fields`, `/matches` | no app scheme | `expo-linking` scheme `footmanager://(tabs)/fields`, `matches`, `tournaments/[slug]`, `player/matches/[id]`; universal links `https://footmanager.com/*`. Handle `action_url` from notifications. |
| **Offline/caching** | React Query stale 60s, no offline | no persisted cache | `mmkv` + `@tanstack/query-async-storage-persister` + `NetInfo`; cache `v1/home`, `v1/stadiums`, `v1/tournaments` reads; queue writes (booking/match) with retry. |
| **Secure storage** | localStorage vulnerable [V] | — | `expo-secure-store` for `auth_token` (never AsyncStorage), mmkv for non-secret prefs. |
| **Error/network** | `components/errors/*` (NetworkError, SessionExpired, RateLimited) | — | Map to native Toast + retry; 401 → SecureStore clear + `/login`; throttle 429 → `Retry-After`. |
| **Updates / maintenance** | `MaintenanceGate`, `PageMaintenanceGate` [V] | — | Replicate: `GET /settings/public` + `GET /maintenance-modules` poll; show blocking screen if `maintenance.enabled && block_reads`. |

**Classification:** Push, camera, biometrics, deep links, location are **C** (mobile-specific). Offline is **C** but optional Phase 1 (read-only cache first).

---

## 21. Existing TODO Cross-Check

**Already implemented ✅** (but still listed in TODO.md):
- `TODO verifier` — weekly subscription conflict etc. now handled by `SlotAvailabilityService` + locks (partial, see TOCTOU).
- `composer install gd` failure — `mpdf ext-gd` [TODO deploy] — needs `Dockerfile php-gd` or `--ignore-platform-reqs` is wrong; fix Dockerfile.

**Partially implemented ⚠️:**
- `analytics today→hourly` [TODO admin/terrain] — backend supports `group_by hour` but frontend fails to display (wrapper + collapse bug).
- `city select` [TODO terrain] — `GET /cities/select` exists [V] but terrain edit still free-text, not select.
- `working hours grid` [TODO] — still list not grid.
- `closure via calendar tap` [TODO] — `/closures` page hard, `CalendarGrid` not wired.
- `timepicker` [TODO manager] — `TimePicker/TimesSelect` exist but new match drawer still native.
- `players plan/essential` [TODO manager] — `is_essential` column exists (`2026_08_19_150000`) but UI minimal.
- `formation system` [TODO far future] — `TeamFormation` model ok, FIFA drag-drop missing.
- `blocked badge` [TODO general] — `status blocked` exists but no badge on manager/team cards.
- `TOC scroll` [TODO landing] — `terms/privacy toc` still `position: sticky` issue.

**Broken 🔴 (reported in TODO, verified):**
- `terrain analytics no data` + `Class Cache not found TerrainOwnerController:749` [TODO] [V] — import missing `use Illuminate\Support\Facades\Cache`.
- `GET /team/statistics 404` [TODO] — now aliased `GET /v1/team/statistics` but manager analytics still calls legacy? fixed partially.
- `finished match no score` [TODO] — `MatchResult submit/confirm` desync.
- `event progressive minute` [TODO committee] — no monotonic check on `match_events.minute`.
- `team1 goal only` [TODO committee] — `MatchEvent only one team` repro, score mismatch error `النتيجة لا تتطابق`.
- `round one done still blocked` [TODO committee] — `progress` gate locks next round.
- `partner/sponsor modal not closing` [TODO] — after save.
- `content order input meaningless` [TODO].
- `news not showing` [TODO] — public gallery/news route mismatch?

**Missing but required ❌ (in TODO, not started):**
- Admin `remove/delete account` (avoid DB bloat) — `AccountController@delete` exists but no UI; `canBeDeleted()` blocks active resources [V] — mobile should not expose.
- Maintenance per-page selector [TODO admin] — `PageMaintenance` model exists but `PageMaintenanceGate` only checks global?
- `login vs info email` split [TODO admin] — not done; `PUT /me` changes login email directly — riskiest hijack.
- One-time recovery login [TODO admin] — `generateRecovery` exists (`POST /admin/accounts/{id}/recovery`) but no login via code flow on mobile.
- Activity lock (`activity.not_locked`) [TODO admin] — backend done, frontend `ActivityLockBanner` exists, but lock does not block login/revoke.
- Sub-admin `admin.manage` duplicate dashboard [TODO admin] — done via `permissions` UI.
- `player asking for team` response missing [TODO admin] — `player_team_requests` approve/reject done but no player feedback notification? fix.

**Planned but not needed for mobile 🔵:**
- Export/print tournament (`committee export` print.css) — D.
- Tournament referee assignment — exists but mobile D.
- Refactor 56-team naming — internal.

**New requirements discovered (not in TODO):** PII scrub, token expiry, chat gating, stats wrapper fix, TOCTOU locks, push domain, haversine, weekly infinite leak, `expires_at` fix, `service_fee` impl, real gateway, device tokens.

---

## 22. Missing Functionality Discovered

| # | Missing | Severity | Evidence | Mobile impact |
|---|---------|----------|----------|---------------|
| M-1 | **Push device registration + provider** | 🔴 Critical | No `devices` table/route; `NotificationPreference push_enabled` exists but never used [V] | Mobile notifications will be in-app only without this |
| M-2 | **`POST /forgot-password` + `POST /reset-password`** | 🔴 Critical | `password_reset_tokens` unused, no broker [V] | Mobile users locked out permanently |
| M-3 | **Email verification** | 🟠 Important | `email_verified_at` never set, `MustVerifyEmail` absent [V] | Trust + duplicate emails |
| M-4 | **Real gateway** (CMI/MoPay) + webhook | 🔴 Critical for paid | `CashPaymentProvider` only, `PaymentProviderManager` single [V] | Mobile payments stub cash only |
| M-5 | **Aggregate terrain analytics** | 🟠 Important | Fan-out 180 reqs, no summary endpoint [A] | Mobile terrain dashboard will be slow |
| M-6 | **Haversine nearby search** | 🟢 Low | No lat/lng [V] | Nearby fields feature missing |
| M-7 | **Rate limiting on writes** | 🟠 Important | Only auth throttled 5,1 [V] | Spam chat/comments |
| M-8 | **Expired subscription handling** | 🟡 Medium | `end_date=null` forever [A] | Infinite active subscription blocks |
| M-9 | **No `GET /v1/bookings/{id}/receipt` frontend link** | 🟡 Medium | Receipt service exists but not shown [A] | Mobile receipt download missing |
| M-10 | **Offline queue** | 🔵 Can Wait | No persister | Booking fails offline |

---

## 23. Mobile Screen Inventory (grouped by role, actual features)

```
Public (no auth)
├── Splash / Onboarding (C) — Required (language select ar/en, permissions)
├── Home (landing) — Required A (hero, liveStatus, matches, availableFields, tournaments, whyUs)
├── Fields (Terrains) List + Filters — Required A (city, format, coverage, sort, paginate, BookingModal)
├── Field Detail — Required A (images Carousel, facilities, pricing, maps link, reviews, slots)
├── Matches (Browse) — Required A (liveMatches, leaderboard, stats, teamCard)
├── Tournaments List — Required A (public GET /v1/tournaments paginated)
├── Tournament Detail — Required B (tabs: Overview/Fixtures/Standings/Bracket/Gallery/News/Sponsors/Partners/Statistics)
├── Team Public Page (/v1/teams/{team}/page) — Required A
├── Stadium Detail (/v1/stadiums/{stadium}) — Required A
├── Live Match Public View (/v1/live/{match} + /v1/live) — Important A
├── News/Gallery Detail — Important A
├── Pricing — Important A (plans comparison)
├── About / Contact / Terms / Privacy — Optional A (static)
└── Search (GlobalSearch sheet) — Important A (fix q param)

Auth
├── Login (phone OR email + password) — Required A (GuestRoute, promoPanel, socialLogin placeholder)
├── Register (4 tabs: manager/terrain_owner/player/committee) — Required A (role-conditional form, premiumField)
├── Pending Approval — Required A (/pending, shows status)
├── Recovery Apply (/recovery 64-char code) — Required A
├── Forgot Password (NEW) — Required C (email/phone → reset link) — missing backend
└── Reset Password (NEW) — Required C

Manager — /dashboard hierarchy
├── Overview (CommandCenter) — Required B (HeroHeader, TodayPanel, QuickBooking, MatchMarket, TeamManagement, PerformancePanel, BookingsPanel, RecruitmentPanel, ActivityFeed + 8 drawers → mobile bottom-sheets) [V]
├── Analytics — Important A/B (RechartsCore, RangeFilter)
├── Matches (My Requests) — Required B (table→card, NewMatchModal, ScoreModal, MatchDetail, LineupDrawer)
├── Feed (Find Opponent) — Required A (MatchFeed cards, send challenge)
├── Recruitment (Free Players) — Required A (search, invite, applicants respond)
├── Team Profile — Required A (PUT profile, logo/cover upload)
├── Players — Required A (CRUD, is_essential toggle)
├── Bookings — Required A (myReservations, request-cancel, from-booking → match)
├── Tournaments — Required A (open_for_registration register/cancel, status badges)
├── Notifications — Required A (NotificationList, prefs)
├── Settings (NotificationPreferences) — Required A
└── Profile (/dashboard/profile) — Required A (avatar upload)

Terrain Owner — /terrain hierarchy
├── Overview — Important B (ownerOverview, overviewAnalytics)
├── Analytics — Important A (RangeFilter, revenue — fix charts)
├── My Terrains (CRUD) — Required B (list, create, edit, photosModal, WorkingHoursEditor grid, FacilitiesPicker, ImageGallery, toggle open)
├── Calendar — Required C (CalendarGrid weekly, stats, PendingBookingsCard, GuestBookingModal, ClosureDrawer; list view + swipe)
├── Bookings — Required A (OwnerBookingCard, BookingDrawer approve/reject, GuestBookingModal)
├── Closures — Required A (ClosureDrawer, slot list)
├── Cancellations — Required A (list, handle approve/reject)
├── Notifications — Required A
├── Settings — Required A
└── Profile — Required A

Player — /player hierarchy
├── Overview — Required A (stat rating/points/winRate, profile card, matches, teamState, discovery)
├── Feed (Available Matches) — Required A (apply with message, PositionGrid)
├── Match Detail (/player/matches/:matchId) — Required B (ManagerProfileCard + PositionGrid + price per player)
├── Applications (invites+requests) — Required A (cancel/accept/decline, ConfirmDialog)
├── Requests (Team Formation) — Required A (storeTeamRequest, teamRequests list, cancel)
├── My Matches — Required A (player matches history)
├── My Team — Required A (roster, isEssential badge, teammates)
├── Profile — Required A (position, level, birthYear, availability toggle, photo/cover)
├── Notifications — Required A
└── Settings — Required A (NotificationPreferences, security password)

Committee — /committee hierarchy — mostly D for mobile (keep read-only mirrors)
├── Overview — Desktop-only D (can show read-only to committee on mobile as Important B)
├── Tournaments List — D (mobile Important if committee uses phone)
├── Tournament Detail 10-tab orchestration — D (mobile show B read-only: fixtures/standings/bracket/statistics)
├── Draw (GroupColumn/TeamPool drag) — D/C (not needed)
└── Notifications/Settings/Profile — Optional A

Admin — /admin/* — Desktop-only D (all 16 pages: overview, analytics, managers/owners/players/committees, requests, moderation, activities, messages, facilities, plans, settings, sub-admins, notifications, profile)
```

**Marking:** Required = must ship MVP; Important = next after MVP; Optional = Can Wait; D = hide from mobile tab bar (responsive web only).

---

## 24. Dependencies & Blockers

```
Environment (EXPO_PUBLIC_API_URL, SENTRY_DSN, FCM sender)
    ↓
API Client (axios → fetch, interceptors, queryClient persister, mmkv, SecureStore)
    ↓
Authentication (Bearer token, SecureStore, GET /me, 401 gate, biometric unlock, forgot/reset)
    ↓
Role System (manager/terrain_owner/player/committee/admin gate, status/activity_locked/maintenance check)
    ↓
Navigation (Expo Router tabs: (public)/fields/matches/tournaments, (manager)/dashboard, (player)/player, (terrain)/terrain, (committee)/committee + modals/drawers → bottom-sheet)
    ↓
Public Features (home, fields, tournaments, search, cities)
    ↓
Player (profile → feed → applications → matches → team)
    ↓
Manager (team profile → players → feed → match create/accept → bookings → lineup → score)
    ↓
Terrain (terrains CRUD → calendar → bookings/closures ↔ Manager bookings)
    ↓
Bookings (availability is cross-cutting blocker for both Manager & Terrain)
    ↓
Match Live (depends on MatchRequest + Tournament Fixture 2h conflict window)
    ↓
Tournament (depends on Teams + Stadiums + Draw; public reads depend on committee writes)
    ↓
Social/Chat/Reviews (depends on user.approved)
    ↓
Notifications (depends on all domains) → Push (NEW: devices + FCM)
    ↓
Analytics (depends on bookings/matches data + cache)
    ↓
Native Features (camera, location, deep links, push) — can parallel after Auth
    ↓
Production (app signing, EAS Build, store review, Railway/Vercel env, APP_DEBUG false, CORS)
```

**Blockers before Phase 2+:**
- 🔴 **Backend PII fix** blocks public field/match release (fields need `owner.phone` scrubbed before store listing).
- 🔴 **Chat gate** blocks live chat release.
- 🟠 **SlotAvailability TOCTOU** blocks booking/match acceptance reliability.
- 🟠 **Stats wrapper** blocks matches/landing stats QA.
- 🟠 **Fan-out aggregate** blocks terrain analytics (mobile can ship list/calendar first, analytics deferred).
- Env: `EXPO_PUBLIC_API_URL` must be production `https://` (not localhost) before device testing.

---

## 25. Recommended Mobile Architecture

**Expo SDK 52+ (managed), TypeScript strict, Expo Router v3 (file-based, typed routes).**

| Concern | Recommendation | Why |
|---------|----------------|-----|
| **Expo Router structure** | `app/(public)/index, fields, matches, tournaments/[slug], (auth)/login, register, (manager)/dashboard/[tabs], (player)/player/[tabs], (terrain)/terrain/[tabs], (committee)/committee/[tabs] + app/_layout (AuthProvider + MaintenanceGate), app/+not-found` | Mirrors `simpleFrontend` role prefixes (`/dashboard→(manager)`, `/player→(player)`, etc.) while keeping public stack unauthenticated; `src/App.jsx:70-74 ProtectedRoute` → `app/(manager)/_layout` guard. |
| **State** | `@tanstack/react-query` 5 (already in web) + `queryClient` persister + `zustand` for ephemeral UI (drawer open, filter) | Reuse `api/queries.js` keys verbatim (`q.me, q.stadiums, q.playerFeed` etc.); persist reads with `mmkv` + `createPersister`; `staleTime 60s` same as web. |
| **API layer** | `src/api/client.ts` fetch (or keep axios) with `EXPO_PUBLIC_API_URL`, `expo-secure-store` for `auth_token`, `mmkv` for prefs, interceptors: attach Bearer, 401 clear SecureStore + `router.replace('/(auth)/login')`, `getApiErrorMessage` mapping, retry 2, `takeAuthRedirect` via `expo-linking`. | Bearer is mobile-native; do not use cookies; match `simpleFrontend/src/api/client.js:10-35` behavior but SecureStore not localStorage. |
| **Auth architecture** | `context/AuthContext` same shape `{user, token, loading, login, register, logout, updateUser}` + `usePermission`, `homeForRole`, `useActivityLock`; store `auth_token` in SecureStore, `auth_user` in mmkv; `GET /me` on mount; biometric `expo-local-authentication` to unlock SecureStore; `POST /forgot-password` + `POST /reset-password` (new backend). | Keeps web semantics; `SecureStore` fixes XSS risk; `activity_locked` check client-side + server `activity.not_locked` is source of truth. |
| **Secure storage** | `expo-secure-store` (token, sensitive) + `react-native-mmkv` (cache, prefs, locale) | localStorage is unavailable + insecure on native. |
| **Caching/offline** | `NetInfo` + `mmkv` + `@tanstack/query-async-storage-persister`; persist `v1/home, stadiums, tournaments` (stale 5m); queue mutations (booking) offline → sync when net restored | Public reads offline-first; bookings need retry. |
| **Images** | `expo-image` (cached), `expo-image-picker` + `expo-image-manipulator` (resize 1080, compress 0.8), upload via `FormData` (`multipart/form-data`), show `ImagePreview` + `expo-sharing` for receipts | Same `mimes jpeg/png/jpg/webp max 4096` validation; thumb generation stays server. |
| **Notifications** | `expo-notifications` (permission request on first Notifications tab), `expo-device` `pushToken`, `POST /api/devices {token, platform}`; backend Fanout via Firebase Admin; handler `Notifications.addNotificationReceivedListener` + `addNotificationResponseReceivedListener` → `router.push(action_url)`; badge `GET /notifications/unread-count` polling 30s fallback | Transforms 56 in-app types to push (high priority for match/booking, opt-in for social). |
| **Deep linking** | `expo-linking` prefix `footmanager://` + universal `https://footmanager.com`; config `app.json scheme footmanager`, `associatedDomains`; map `action_url` from `app_notifications.data` to `router.push` | Enables WhatsApp fallback removal + notification tap to deep link. |
| **Location** | `expo-location` `requestForegroundPermissionsAsync` only when user taps Nearby; fallback to `GET /cities/select` dropdown (already fixed) | Distance is optional Can Wait; do not block booking without permission. |
| **Error handling** | `components/errors` port (NetworkError, RateLimited, SessionExpired → login, ServerError) + `react-error-boundary` + `Toast` (already in `simpleFrontend`); global `queryClient` retry + `onError` toast via `getApiErrorMessage` | Consistent with web. |
| **Reusable UI** | Port `src/components/ui` (Button, Input, Card, Badge, Spinner, Modal→BottomSheet via `@gorhom/bottom-sheet`, Drawer→Sheet, Toast, Calendar via `react-native-calendars`, Recharts → `victory-native` or `react-native-svg-charts`) | Keeps design system; `simpleFrontend` uses logical RTL props — mirror with `I18nManager` RTL. |
| **RTL/i18n** | `i18next` + `expo-localization` + `I18nManager`; copy `locales/ar.json,en.json` verbatim (extract hardcoded strings [TODO]); `allowRTL(true)` on ar | Preserves Arabic default. |
| **EAS** | `eas.json` dev/preview/production, `app.json` `expo.updates.url` + `runtimeVersion`, `EXPO_PUBLIC_API_URL` per env, `expo-secure-store` entitlements | Railway/Vercel prod URL; `APP_DEBUG false` required. |

---

## 26. Proposed Mobile Development Phases

*Derived from dependency graph §24, not desktop phases. Each phase lists prerequisites, risks, completion criteria.*

### Phase 1 — Environment & Mobile Foundation 🔴 Urgent

- **Objective:** Expo+TS project boots, talks to prod API, auth works on device with SecureStore, RTL i18n, error gates.
- **Features:** `npx create-expo-app` + TS strict + Expo Router file structure + eslint/oxlint, `.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`), `api/client.ts` (axios/fetch + Bearer + 401), `api/queries.ts` port of `queries.js` 47 keys, `context/AuthContext` (SecureStore), `i18n` (copy `ar.json/en.json` + `I18nManager` RTL), `layout/AppLayout`, `components/ui` base (Button/Input/Card/Spinner/Toast/BottomSheet), `system/MaintenanceGate` (reuse `GET /settings/public`), `+not-found`, `SplashScreen`, `ErrorBoundary`, `NetworkError` handling, `NetInfo` + `mmkv` skeleton, `app.json` scheme `footmanager`, `eas.json` dev.
- **Backend deps:** None (existing API). **Must fix before QA:** `sanctum.expiration null → 7d`, `.env APP_DEBUG false` in prod, `EXPO_PUBLIC_API_URL=https://api.footmanager.com/api` (not localhost).
- **Prereqs:** Node 18+, Expo SDK, Railway prod URL, Firebase project (placeholder).
- **Risks:** localhost URL traps image fetches; SecureStore entitlements missing on iOS.
- **Done when:** `expo start` shows language selector → login with manager/player/committee/terrain_owner 4 flows → `/me` correct role → 401 redirects to login on device (not simulator only) → RTL toggles.

### Phase 2 — Authentication Hardening + Role Shell 🔴 Urgent

- **Objective:** Every role can auth securely; blocked/pending/activity_locked UX correct; role-isolated tabs.
- **Features:** Login (phone OR email), Register 4 tabs (reuse `RegisterRequest` validation: `password min:8`, phone unique), Pending screen (poll `GET /me`), Recovery Apply (`POST /recovery/apply`), **NEW** Forgot/Reset (`POST /forgot-password`, `POST /reset-password` — backend stub if not ready: show "contact admin"), `PUT /me` + avatar upload (`expo-image-picker`), `homeForRole` navigation (`/dashboard` vs `/player` vs `/terrain` vs `/committee` vs `/admin` hidden), `ProtectedRoute` per `(manager)/(player)/(terrain)/(committee)` layout guards, `ActivityLockBanner` (reads `user.activity_locked`), `usePermission` for sub_admin, biometric unlock (`expo-local-authentication`) opt-in on Settings, session revoke `DELETE /v1/player/security/sessions`.
- **Backend deps:** **NEW** `POST /password/forgot` + `POST /password/reset` via broker; **fix** `sanctum expiration`, revoke on `lockActivity`/`block`, `activity_locked` login check (or at least 401 on `/me` with message), `unique:users,email/phone` on update, `Password::defaults min:12`.
- **Prereqs:** Phase 1, prod API with fixed auth messages.
- **Risks:** `email nullable` breaks reset — require phone fallback.
- **Done when:** 4 roles register→pending→admin approve→login→see correct tab bar (manager 7 items, player 7, terrain 7, committee 2, admin hidden); locked user sees banner and writes blocked (403 activity_locked); biometric unlocks token.

### Phase 3 — Public Browsing (no auth) 🔴 Urgent

- **Objective:** Guest can browse as well as web landing, with offline cache.
- **Features:** Home (hero, liveStatus, matches, availableFields, tournaments, whyUs) from `GET /v1/home` (fix `r.data.data` double-wrapper), Fields list `GET /v1/stadiums` with city/format/coverage/sort/paginate (`useInfiniteQuery` + `react-virtual`), Field detail (images Carousel, Facilities, price, `google_maps_url` → `Linking.openURL`, reviews `GET /v1/stadiums/{s}/reviews`), Matches browse `GET /v1/matches + live-matches + leaderboard` (fix stats), Tournaments list/detail (`GET /v1/tournaments`, `fixtures/standings/bracket` tabs), Team public page `GET /v1/teams/{team}/page`, Stadium detail, Contact form `POST /contact/messages` (`throttle:contact`), Pricing `GET /v1/plans`, Search (`GET /v1/social/search` + suggest + recent + popular) fix `q` param, Cities `GET /cities/select`, Cities page, Terms/Privacy/About static with TOC fix, deep links `footmanager://fields/[id]`, `tournaments/[slug]`.
- **Backend deps:** Fix `GET /v1/stats` wrapper docs; scrub `owner.phone` PII on stadium show; fix `GlobalSearch q` alias.
- **Prereqs:** Phase 1 (no auth needed).
- **Risks:** Image `http://localhost:8000` breaks on device — use prod host.
- **Done when:** Guest scrolls home→fields→field detail→book button (prompts login)→matches→tournaments detail→contact send, all offline-cached reads work in airplane mode (stale 1h), deep link `footmanager://tournaments/demo` opens detail.

### Phase 4 — Player Essentials 🟠 Important

- **Objective:** Player is fully functional — the demand side of the marketplace.
- **Features:** `v1/player/profile` GET/PUT + photo/cover + availability-status (`Available` toggle), gallery CRUD (`reorder/cover`), `performance/*` reads (recent/heatmap/positions/best/form), `career/history + transfers`, `leaderboard`, `GET /player/match-feed` feed cards, `POST /player/matches/{id}/apply` (+ position+message, `NeedPlayersField`), `GET /player/applications` (cancel/accept/decline with ConfirmDialog), `GET /player/matches` history, `GET /player/profile` teamState + `storeTeamRequest` flow (`POST /player/team-requests` + `teamRequests` list/cancel), `GET /player/my-team` roster + PositionGrid, `GET /v1/player/profiles/{id}` for manager view, notifications/settings (`PUT push` prefs). Push on `player_invite_received`, `player_application_accepted/declined`.
- **Backend deps:** Fix `apply` full vs conflict 422 messages; expose `positions_needed` consistently; ensure `team_formation_request` not sent to committee (TODO bug).
- **Prereqs:** Phase 2, Phase 3 search.
- **Risks:** `positions_needed` not defined by manager → empty grid; handle gracefully.
- **Done when:** Player signs up→sets city/position/level→browses feed→applies→sees application→manager accepts→match appears in matches→team roster visible; `player_team_request` pending→admin approves→Team created.

### Phase 5 — Manager Core (Team + Match Market) 🟠 Important

- **Objective:** Manager can form team, find opponent, book terrain — loop closes.
- **Features:** `v1/manager/team` show/put, logo/cover upload (camera), gallery CRUD, `players` CRUD + `team-members` add/remove/toggleEssential/changePosition + `captain/vice-captain/free-kick`, `formation` show/put (preset 5v5/7v7, not drag yet), `announcements`, `attendance`, `statistics` (keep lightweight, fix `GET /v1/team/statistics` alias), `dashboard` (TeamDashboard `index` + `GET /manager/my-match-requests|received-challenges` lists), `match-requests` store (`stadium|custom_terrain, match_datetime, end_time, needs_players, positions_needed, price_per_player`) with `TimesSelect` (show `GET /terrains/{id}/slots` open times), `challenges` send (`target_team_id`), `matchFeed` list + accept (`POST /manager/match-requests/{id}/accept` lock-safe), `challenges/{id}/respond`, `matches/pending-scores|pending-confirmations`, `matches/{id}/submit-score|confirm-score|dispute-score` (ScoreModal), `match-requests/{id}/lineup/roster/captain` (MatchLineupDrawer), `recruitment/search|invite|respond`, `tournaments` register/cancel.
- **Backend deps:** Fix TOCTOU on `match-requests store`, `challenges respond`, `accept` weekly DOW lock + `confirmed` status inclusion; fix orphan on terrain closed (validate before insert); fix `isFull` vs `players_joined` drift; add `GET /manager/terrains/{id}/my-reservations` for slot conflicts.
- **Prereqs:** Phase 4 (needs players), `SlotAvailabilityService` fixed.
- **Risks:** Time picker behind modal — use native bottom-sheet; `price_per_player` float typing (`decimal(10,2)` vs `decimal(8,2)`).
- **Done when:** Manager creates team→adds 5 players→sets captain→creates public match need 2 players `price 50MAD` → player applies→manager accepts applicant→feed opponent accepts→score 3-1 submitted→opponent confirms→leaderboard increments + notification.

### Phase 6 — Terrain Owner (Booking & Calendar) 🟠 Important

- **Objective:** Terrain owner can monetize — the supply side.
- **Features:** `owner/terrains` CRUD (name, city SELECT from `GET /cities/select`, address, `google_maps_url`, capacity, prices `price_per_team/total_price/price_per_hour` clarify one source, `FacilitiesPicker`, `ImageGallery` max 6 + cover, `WorkingHoursEditor` grid), `toggle-status` (block if future approved exist), `terrains/{id}/calendar?week` list view (not grid) with `BookingTimeline`, `bookings` list + `PUT approve|reject`, `guest-bookings` `POST /terrains/{id}/guest-bookings` (guest_*), `slot-closures` index/store/destroy (`ClosureDrawer` tap empty slot), `cancellation-requests` list + `PUT handleCancellation`, `overview` + `analytics/overview?mode + analytics/details` (use aggregate — defer full charts if still fan-out), `stats`.
- **Backend deps:** **NEW** `GET /owner/analytics/summary?range&group_by` aggregate (replace fan-out); fix `Cache` import; fix `updateWorkingHours` conflict with future bookings; lock on `slot-closures` store; weekly guest blocked forever fix.
- **Prereqs:** Phase 5 (manager bookings depend on terrain).
- **Risks:** Calendar weekly grid is heavy — mobile list view + pagination is B redesign.
- **Done when:** Owner creates terrain→sets hours Mon-Sun 08:00-22:00→sees calendar week 1 pending booking→approves→manager sees confirmed→closes 14:00-15:00 slot→next booking on that slot 422→cancellation request appears.

### Phase 7 — Booking Commerce (confirm, payment, receipt) 🟡 Medium

- **Objective:** Money path works (even if cash today).
- **Features:** `POST /v1/bookings/confirm` (already race-safe) with `slot` validation + `NoOverlappingBooking` weekly, `POST /v1/bookings/{id}/payment-intent` (cash provider stub, countdown `expires_at` — fix `slotStart`→`now+30m`), `cancel` (`POST /v1/bookings/{id}/cancel` with refund% via `CancellationPolicy`), `history/upcoming/show`, `GET /v1/bookings/{id}/receipt` PDF+QR download via `expo-print`/`expo-sharing`, `manager/bookings` request-cancel flow (fix `DELETE` dead route → `POST request-cancel`), training `POST /manager/bookings/training` + weekly, `direct-bookings` store.
- **Backend deps:** Fix `expires_at`, `service_fee`, money typing `>=0` check, add webhook skeleton for future CMI (`CashPaymentProvider` webhook throws today).
- **Prereqs:** Phase 6, Phase 5.
- **Risks:** `total` vs `price` sum confusion in `bookingsData.js`.
- **Done when:** Manager books terrain single→`GET /terrains/{id}/slots` shows taken→payment-intent initiated→shows QR→cancels 3h before→refund 50% via policy→receipt PDF opens.

### Phase 8 — Live Match & Chat 🟡 Medium

- **Objective:** Match day experience — live minute, events, chat, mvp.
- **Features:** `v1/live` index + `v1/live/{match}` show, `v1/live/{match}/start|pause|resume|minute|finish|cancel|postpone` (LiveMatchController, manager only), `events` store/put/delete (goal/penalty/card/sub), `statistics` put, `lineup` put, `performance` put, `mvp` award, chat `GET /live/{match}/chat` (now gated) + `POST store/announcement/read/mute/unmute`, `report` message, `pin` message, readStatus. Poll `refetchInterval 10s` + optimistic, event timeline, scoreboard, minute monotonic guard.
- **Backend deps:** Fix chat auth (`GET .../chat` needs `auth:sanctum`+membership), scope `team/player_id ∈ match`, minute monotonic; add `Broadcast` later (today polling ok).
- **Prereqs:** Phase 5 (match must be accepted/live).
- **Risks:** `FootballMatch` vs `MatchRequest status live` dual machines desync.
- **Done when:** Manager starts match→minute 0→records goal 35' team A→score 1-0→records card→pauses→resumes→finishes→stats visible on `v1/live/{m}` + push `live_match_started/goal_scored/match_finished`.

### Phase 9 — Tournament Fan (read-only) 🟡 Medium

- **Objective:** Every authenticated role can follow a tournament — lightweight.
- **Features:** `GET /v1/tournaments` list (already public), `.../{t}/registration` me/register/destroy (manager), `fixtures/standings/bracket/statistics/gallery/news/sponsors/partners/matchDetail` reads (public), contact `POST messages` (`throttle:contact`). Hide committee orchestration (draw/fixtures write) behind `committee.approved` guard (show "open on web" placeholder).
- **Backend deps:** Fix news not showing, `order input`, sponsor modal close, `progress` round block bug (but reads unaffected).
- **Prereqs:** Phase 3.
- **Risks:** None — reads are stable.
- **Done when:** Player/manager sees tournament→registers team→committee approves (web)→fixtures→standings update after result→bracket populate→gallery images scroll.

### Phase 10 — Social & Reviews 🟢 Low

- **Objective:** Community layer — follows, comments, favorites, reviews.
- **Features:** `v1/social/search*`, `comments` store/reply/update/destroy/like/pin/report, `reactions` store/destroy/show, `follow` store/destroy/followers/following/status, `favorites` store/destroy/index/status, `live` feed `GET /v1/feed`, `comments` list, `players/{p}/reviews`, `stadiums/{s}/reviews`, review writes (`players/{p}/reviews/{match}`, `stadiums/{s}/reviews/{booking}`) via `module:reviews`.
- **Backend deps:** Add `throttle` on writes; fix `FollowController` self-follow; ensure RL.
- **Prereqs:** Phase 2 (user.approved).
- **Risks:** `Activity` LIKE query heavy.
- **Done when:** Player follows manager→likes comment→favorites stadium→reviews player after match→review appears on `v1/players/{p}/reviews`.

### Phase 11 — Push & Deep Links Native Polish 🟢 Low

- **Objective:** App feels native — push, badging, links, offline.
- **Features:** FCM/APNs token register `POST /devices`, topic subscribe per `action_url`, badge sync `GET /notifications/unread-count`, notification categories (7 `CATEGORY_MAP`), deep link router for 56 `notification.types`, `expo-updates` OTA, `Sentry` crash reporting, offline persister for `v1/*`, background fetch for `live minute` tick, `ActivityLockBanner` global.
- **Backend deps:** NEW device endpoints + Firebase Admin push channel; add `push_enabled` to `NotificationPreferenceService`.
- **Prereqs:** Phase 8 + 9.
- **Risks:** iOS APNs cert, Android FCM quota.
- **Done when:** Booking approved → manager phone push + tap opens `manager/bookings` → badge increments → readAll clears badge.

### Phase 12 — Committee Lite (optional, desktop-first) 🔵 Can Wait

- **Objective:** Committee can approve registrations on phone if needed — minimal.
- **Features:** Read-only tournament detail already; add mobile-optimized `registrations approve/reject/markPaid` + `teams` list + `standings` read. Hide draw/fixtures write (link "Open on web"); if required, add `draw` approve/unlock read-only + `fixtures` reschedule via native picker.
- **Backend deps:** None.
- **Prereqs:** Phase 9.
- **Risks:** Draw drag-drop is **C** — not worth mobile reimplement.
- **Done when:** Committee on phone approves pending registration → push to manager "registered" — no draw on phone.

---

## 27. Risks

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| R-1 | Stolen bearer token forever (no expiry) | 🔴 | High | Set `sanctum.expiration 7d` + rotate on password change; SecureStore only; revoke on block/lock. |
| R-2 | PII leak via public stadium/leaderboard/slots | 🔴 | High | Scrub resources before Phase 3 store release. |
| R-3 | Double-booking (weekly DOW + confirmed status) | 🔴 | Med | Wrap all booking/match paths in `transaction+lockForUpdate(stadium)` + include `confirmed` in calendar queries. |
| R-4 | `http://localhost:8000` images fail on device | 🔴 | High | Require `EXPO_PUBLIC_API_URL=https://api...` in `app.json` + `Storage::url` prod disk `s3` or `public` with `APP_URL` prod. |
| R-5 | Chat spam/abuse (no throttle, public read) | 🟠 | Med | Gate `GET chat` + `throttle:10,1` on `POST chat`, `mute` policy. |
| R-6 | Terrain analytics fan-out crashes on many terrains | 🟠 | Med | Ship Phase 6 calendar first, defer analytics to aggregate endpoint. |
| R-7 | Weekly subscription leaked forever (`end_date null`) | 🟡 | Low | Add validation `end_date required` + `max 52 weeks`; migrate null→`start+4w`. |
| R-8 | iOS SecureStore/keychain + APNs cert failures | 🟡 | Med | EAS credentials `eas credentials`, test TestFlight early Phase 2. |
| R-9 | RTL `rotate-180`/`divide-x` bugs + hardcoded ar | 🟢 | Low | Fix `ChevronRight rtl:rotate-180`, `divide-x rtl:divide-x-reverse`, extract hardcoded strings before Phase 3. |
| R-10 | `APP_DEBUG true` stack trace info disclose | 🔴 | High | CI check `grep APP_DEBUG .env` fails build if true on prod. |
| R-11 | No password reset locks out mobile users | 🔴 | High | Backend must ship forgot/reset before Phase 2 QA (or document admin recovery code flow). |
| R-12 | Composer HIGH advisories (guzzle/commonmark) | 🟠 | High | `composer update guzzlehttp/guzzle league/commonmark` before prod. |
| R-13 | `Recharts` not RN-native | 🟢 | High | Use `victory-native` + `react-native-svg` for manager/team analytics (already `recharts` in web). |
| R-14 | `Facility image max 6` not server-enforced | 🟢 | Low | Add `max:6` validation on `uploadImages`. |

---

## 28. Final Recommendations

1. **Reuse API as-is (95%).** Do not rebuild auth, bookings, match, team, tournament reads. Mobile is a **new presentation of existing resources**. Only add **5 new endpoints**: `POST /devices` + `DELETE /devices/{id}`, `POST /password/forgot`, `POST /password/reset`, `GET /owner/analytics/summary` aggregate, optional `GET /v1/stadiums?lat&lng&radius`.

2. **Fix before Phase 3 store QA (blocking):**
   - `config/sanctum.php:53 expiration => 60*24*7` + token rotation on `SecurityController@updatePassword` + revoke on `block/lockActivity`.
   - PII: scrub `StadiumDetailsResource` (no phone), replace `PlayerLeaderboardController` raw dump with `PlayerLeaderboardResource` allow-list, strip `manager.phone` from `getTerrainSlots`.
   - `GET /v1/live/{match}/chat` gate + membership policy + `throttle:10,1`.
   - `GET /v1/stats` consumers `.then(r=>r.data.data)` 2-line fix (`liveStatus.jsx:40`, `matches/stats.jsx:23`).
   - `BookingService`/`MatchRequest` TOCTOU locks + weekly DOW + `confirmed` status inclusion + orphan validate-before-insert.
   - `Cache` import in `TerrainOwnerController:749` + `VITE_API_URL` → `EXPO_PUBLIC_API_URL` prod.
   - `composer update` + set `APP_DEBUG=false`, `FRONTEND_URL=https://...`, `SANCTUM_STATEFUL_DOMAINS` prod in Railway/Vercel env.

3. **Mobile implementation strategy:**
   - **Reuse exactly:** all `v1/*` public reads, `auth/*` login/register/`GET /me`, `v1/bookings/*`, `v1/manager/team/*` where safe, `v1/player/*`, `notifications`, `social` reads, `tournaments` public.
   - **Require modification:** 8 endpoints above (PII/chat/TOCTOU/stats).
   - **Require new:** push devices + forgot/reset + analytics summary.
   - **Response optimization:** paginate `v1/feed`, `v1/comments`, `leaderboard`; add `?per_page=24` already on tournaments; add `select` sparse fieldset if needed later.
   - **Image URLs:** keep `Storage::url()` but ensure `APP_URL` prod (`https://`) so mobile fetches succeed; CDN (Cloudflare R2) later.

4. **Do not start with "setup → login → dashboard" generic phases.** Use **dependency-derived phases §26**: foundation → auth hardening → public browsing (parallelizable) → player → manager → terrain → booking commerce → live → tournament fan → social → push polish. Public browsing can ship as **standalone guest app** before roles.

5. **Verification steps for next agent (Phase 1 kickoff):**
   - `expo start` on Android+iOS simulator → login as each of 6 roles against `https://api.staging` → `GET /me` role correct → kill app → reopen → SecureStore token persists → lock account via `PUT /admin/accounts/{id}/lock-activity` → 403 on `PUT /me` → unlock.
   - Public smoke: `GET /v1/stadiums` returns without `owner.phone` → field detail shows images via prod URL → `GET /terrains/{id}/slots` no manager phone.
   - Booking smoke: create single `POST /v1/bookings/confirm` concurrent 2 requests → one 409 `terrain slot already taken` (lock works).
   - `/v1/stats` returns `{data:{teams, stadiums,...}}` and UI shows numbers not `…`.

6. **Keep `simpleFrontend/` as spec.** Do not copy its `CommandCenter` 3-col layout or `CalendarGrid` weekly grid to mobile. Use bottom-sheets for 8 drawers, list view for calendar, card virtualized for `DataTable`, preset selector for formation. Copy its **query keys** (`api/queries.js:10-47`) and **adapters** (`lib/adapters.js`) verbatim to keep parity.

7. **Commit this audit as `MOBILE_AUDIT.md` at repo root** and treat `TODO.md`/`AUDIT.md`/`v2overview.md` as superseded for mobile planning. Next command should be `/phase-1-env-setup` with file scaffolding, not code fix.

---
*Evidence: `backend/routes/api.php:1-950` [V], `backend/app/Models/User.php:38-52 fillable` [V], `backend/config/sanctum.php:53` [V], `simpleFrontend/src/App.jsx:36-74` [V], `simpleFrontend/src/api/client.js:10-35` [V], `simpleFrontend/src/context/AuthContext.jsx:44-52` [V], `simpleFrontend/src/api/queries.js:10-47` [V], `backend/tests/Feature/*` 22 files [V]. Verified 2026-08-24 — no code modified per instructions.*
