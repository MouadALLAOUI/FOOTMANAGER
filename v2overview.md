# FootMANAGER v2 — Full Application Audit

Date: 2026-08-07 · Auditor: opencode (deep code audit, source-verified)
Scope: **Database → Backend → API → Frontend**, both `backend/` (Laravel 12, PHP ^8.2, Sanctum v4, MySQL) and `simpleFrontend/` (React + Vite + Tailwind, RTL ar/en).

Evidence legend: **[V]** verified by direct source read · **[A]** sub-agent audit (high confidence, cross-checked) · **[X]** verified OK — no action.

---

# 1. Scope, Method & Inventory

**Method:** 79 migrations, 68 controllers, 46 services, 16 policies, 10 Form Requests, 55 resources, 4 middleware, `routes/api.php` (445 lines), 101 frontend pages, 133 frontend files were inventoried; DB, backend, API-shape and frontend audits were run in parallel; all security/functional claims were re-verified against source before inclusion.

**Codebase size:**
| Layer | Count |
|---|---|
| Migrations | 79 (68 tables, ~475 columns, 124 FKs, 56 indexes, 36 unique constraints, 40 enums) |
| Controllers | 68 |
| Services | 46 |
| Policies / Gates | 16 |
| Form Requests | 10 |
| API Resources | 55 |
| Frontend pages | 101 (`.jsx`) |
| Frontend total files | 133 |
| i18n locales | `ar.json`, `en.json` |

---

# 2. DATABASE STRUCTURE AUDIT

## 2.1 Table Inventory (68 tables)

**Framework (9):** `users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `personal_access_tokens`

**Stadium / booking (13):** `stadiums`, `terrain_images`, `terrain_schedules`, `terrain_bookings`, `terrain_slot_closures`, `cancellation_requests`, `cancellation_policies`, `facilities`, `facility_terrain`, `payments` · (`teams`, `match_requests`, `players` — see club)

**Club / player (20):** `teams`, `match_requests`, `players`, `team_gallery_images`, `team_match_players`, `attendances`, `team_formations`, `team_announcements`, `announcement_reads`, `player_profiles`, `player_match_requests`, `player_team_history`, `player_transfers`, `player_gallery_images`, `player_availability_slots`, `player_match_stats`, `player_statistics`, `achievements`, `player_achievements`, `settings`

**Competition (12):** `competitions`, `seasons`, `rounds`, `groups`, `matches`, `fixtures`, `match_events`, `match_statistics`, `match_lineups`, `player_match_performances`, `match_media`, `standings`

**Social (16):** `app_notifications`, `notifications`, `notification_preferences`, `comments`, `comment_likes`, `reactions`, `follows`, `favorites`, `player_reviews`, `stadium_reviews`, `match_chat_messages`, `match_chat_reads`, `match_chat_mutes`, `activities`, `reports`, `search_histories`, `search_terms`

## 2.2 DB Findings

### CRITICAL
| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| DB-C1 | **Two parallel notification systems.** Migration files `2026_07_28_000003` and `2026_08_07_000014` are both named `create_notifications_table`; one creates `app_notifications` (custom: `title/body/is_read/is_pinned/data json`), the other Laravel's default `notifications` (`data text`, morph). Verified: **no table-name collision**, `migrate:fresh` succeeds, but two models/schemas are live (`AppNotification.php` + framework). | [A][V] `2026_07_28_000003_create_notifications_table.php:11`, `2026_08_07_000014_create_notifications_table.php:11` | Rename one migration; consolidate on a single notification system |

### HIGH
| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| DB-H1 | **Deleting a team cascades away the entire match history.** `matches.home/away_team_id` use `cascadeOnDelete()`; same for `fixtures` and `match_requests.host_team_id`. Deleting a team silently wipes `matches` + `match_events/statistics/lineups/performances/media/chat`. | [A] `2026_08_07_000005_create_matches_table.php:19-20`, `000006:18-19`, `2026_07_25_000004:13` | `restrictOnDelete()` (or `nullOnDelete()` on nullable) for historical data |
| DB-H2 | **Three overlapping per-player-per-match stat tables** — `player_match_stats` (FK `match_request_id`, `user_id`), `team_match_players` (FK `match_request_id`, `player_id`), `player_match_performances` (FK `match_id`, `player_id`) all store goals/assists/rating/mvp/minutes. Data will diverge. | [A] `0004500`, `0003200`, `0001000` | Keep one canonical table (recommend `player_match_performances`) and merge/drop the others |
| DB-H3 | **Leaderboard counters duplicated across tables** — `teams.points/matches_played/wins/...` also in `standings`; `player_profiles.points/rating/...` also in `player_statistics`. Drift-prone. | [A] `2026_07_25_000003:25-29`, `2026_07_25_000009:12-14`, `000012:17-24` | One authoritative table + sync job |
| DB-H4 | **`stadium_reviews` unique constraint bypassable.** `unique(user_id, booking_id)` with nullable `booking_id` → unlimited NULL rows per stadium. | [A][V] `2026_08_07_000020_create_stadium_reviews_table.php:15,28` | Add `unique(user_id, stadium_id)` |
| DB-H5 | **`standings` unique constraint bypassable.** `unique(competition_id, season_id, group_id, team_id)` with nullable `group_id` → duplicate rows for non-group leagues. | [A] `2026_08_07_000012_create_standings_table.php:15,28` | Enforce in app logic or use sentinel group |

### MEDIUM
| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| DB-M1 | `sessions.user_id` indexed but **no FK** (orphan rows). | [A] `0001_01_01_000000_create_users_table.php:33` | `constrained('users')` |
| DB-M2 | `match_chat_reads.last_read_message_id` — **no FK, no index** (references messages by convention). | [A] `2026_08_07_000021_create_match_chat_tables.php:31` | Add FK + index |
| DB-M3 | `terrain_slot_closures.start_time/end_time` stored as `string(5)` → lexicographic compares, no time validation. (`terrain_schedules` correctly uses `time`.) | [A] `2026_07_28_000001_create_terrain_slot_closures_table.php:15-16` | `$table->time()` |
| DB-M4 | `users.email` **nullable and NOT unique**; login lookups unindexed, duplicates allowed. | [A][V] `0001_01_01_000000_create_users_table.php:16` | `unique()` (nullable-unique) |
| DB-M5 | **Money typing inconsistent** — `decimal(8,2)` (`stadiums.price_per_team/total_price/price_per_hour`, `match_requests.price_per_player`) vs `decimal(10,2)` (`terrain_bookings.price/subtotal/service_fee/total/refund`, `payments.amount`); no `>= 0` checks; `payments.currency` default `'MAD'`. | [A] `000012:19-20`, `0001000:16`, `0002000:21`, `002002:16-18`, `002003:17` | One money type + CHECK `>= 0` |
| DB-M6 | `stadiums` carries **three overlapping price columns** (`price_per_team`, `total_price`, `price_per_hour`); booking stores its own `price`. Ambiguous pricing source of truth. | [A] `000012:19-20`, `0001000:16` | Derive booking price from a single stadium column |
| DB-M7 | **Nullable + `cascadeOnDelete` contradiction** on `rounds.season_id`, `groups.season_id/round_id`, `player_match_performances.team_id` — deleting parent removes "optional" children. | [A] `000003:14`, `000004:14-15`, `0001000:14` | Use `nullOnDelete()` |
| DB-M8 | `terrain_bookings` redundancy: 3 date columns (`booking_date/start_date/end_date`), 4 money columns, `status` enum with overlapping `approved`+`confirmed`, `reservation_type` is a loose `string`. | [A] `0002000:18`, `000300:14-15`, `002002:16-18,37-39` | Normalize; merge statuses; enum `reservation_type` |
| DB-M9 | **Status modeling fragmented**: enums on `users.status`, `cancellation_requests.status`, `terrain_bookings.status`, `player_match_requests.status`; but **loose `string(20)`** on `reports.status`, `comments.status`, `player_reviews.status`, `stadium_reviews.status`, `match_chat_messages.status`. | [A] `000023:17`, `000015:17`, `000019:23`, `000020:25`, `000021:20` | Shared status vocabulary (enum or CHECK) per domain |
| DB-M10 | **Match lifecycle modeled 3 ways** — `match_requests.status` enum vs `matches.status` string(30) vs `fixtures.status` string(20). | [A] `000006:12`, `000005:22`, `000006:21` | One status constant set |

### LOW
| # | Finding | Evidence |
|---|---------|----------|
| DB-L1 | `players.position` string vs `player_profiles.position` enum (same concept). | `000011:15` vs `000300:14` |
| DB-L2 | `player_profiles` duplicates `players` attrs: `height_cm/weight_kg/preferred_foot`; `birth_year` + `birth_date`; `preferred_foot` + `strong_foot`. | `003700`, `000300`, `004000` |
| DB-L3 | Denormalized counters drift-prone: `teams/players/stadiums.followers_count`, `stadiums.rating/reviews_count`, `players.rating_avg/reviews_count`, `player_profiles.rating` + `overall_rating`. | `000017`, `001000`, `000019`, `000300/004000` |
| DB-L4 | `search_terms.count` default `1`; increment not atomic. | `000024:23` |
| DB-L5 | `player_team_history` no unique constraint — multiple `is_current=true` per user. | `0004200:11-25` |
| DB-L6 | `terrain_slot_closures` no unique `(terrain_id, closure_date, start_time)`, no index on `closure_date`. | `000001:11-19` |
| DB-L7 | `player_match_requests.player_id` **references `users`, not `players`** — misleading naming. | `000400:13` |
| DB-L8 | `stadiums.type` enum default silently changed `minifoot`→`salle` when `cement` added; existing rows keep old value. | `2026_08_04_000001:12` |
| DB-L9 | Only 2 of 68 tables use soft deletes (`comments`, `match_chat_messages`); moderation/history tables hard-delete. | `000015:20`, `000021:21` |
| DB-L10 | Raw MySQL `ALTER TABLE ... MODIFY ... ENUM` statements — **not PostgreSQL-portable** (AGENTS.md lists PostgreSQL as supported). | `000006:12`, `000007:10`, `000014:10`, `08_06_000100:10` |

**DB stats summary:** 68 tables · 124 FKs · 2 FK columns without constraint (`sessions.user_id`, `match_chat_reads.last_read_message_id`) · 56 explicit indexes · 40 enums · 0 duplicate table-name conflicts.

---

# 3. BACKEND AUDIT (models · controllers · services · policies)

## 3.1 Critical / High

| # | Severity | Finding | Evidence | Fix |
|---|----------|---------|----------|-----|
| BE-1 | **High** | **TOCTOU double-booking on non-V1 booking paths.** Conflict-check then `create` without a lock in `createTrainingBooking`, `DirectBookingController::store`, `MatchFeedController::accept`, `MatchRequestController::store`/`respondToChallenge`. Two concurrent requests both pass the check → overlapping `pending` bookings. (V1 `BookingService::confirm` is safe — uses `Stadium::lockForUpdate()`, [V] `BookingService.php:25-28`.) | [A][V] `Terrain/BookingController.php:166-205`, `DirectBookingController.php:55-91`, `MatchFeedController.php:52-112`, `MatchRequestController.php:118-154,288-311` | `DB::transaction` + `lockForUpdate` on terrain row as single serialization point, or DB partial unique index on active `(terrain_id, date/day, start_time)` |
| BE-2 | **High** | **Blocked/pending users retain working Sanctum tokens.** Block only flips `status` (`ManagerApprovalController.php:116-128`, `PlayerApprovalController.php:104-113`), never revokes tokens. `auth:sanctum`-only endpoints (social write, chat read, `/me`, notifications, reviews — `routes/api.php:243-321`) remain usable by blocked/pending accounts. The 3 role middlewares only guard feature groups. | [A][V] `routes/api.php:243-321`, admin block controllers | Revoke `$user->tokens()->delete()` on block; add global approved-status guard for all authenticated routes except login/register |
| BE-3 | **High** | **Live-match endpoints accept arbitrary `team_id`/`player_id` not belonging to the match.** `Gate::authorize('manage', $match)` checks the manager runs home/away team, but `setLineup`/`setStatistics`/`setPerformance`/`awardMvp`/`storeEvent` only validate `exists:teams/players,id` — a manager can corrupt lineups, statistics, ratings and MVP for **any team/player in the system**. | [A][V] `LiveMatchController.php:129-140,179-194,209-222,270-294`; `MatchPolicy.php:20-28` | Validate `team_id ∈ {match.home_team_id, match.away_team_id}` and `player_id ∈ that team's squad` |
| BE-4 | **High** | **Match chat transcript public + no membership policy.** `GET /v1/live/{match}/chat` has no auth (`routes/api.php:90`, `MatchChatController::index:24`). `MatchChatPolicy::send`/`mute` only check `status==='approved'` + mute state — any approved user (manager/owner/player) posts to **any** match. | [V] `MatchChatController.php:24-39`, `MatchChatPolicy.php:11-24,54-57` | Gate chat reads; enforce match membership in policy |
| BE-5 | **High** | **PII exposed publicly (3 endpoints).** (a) `GET /v1/stadiums/{stadium}` → `StadiumDetailsResource:20-24` includes `owner.phone`+`is_whatsapp`. (b) `GET /leaderboard/players` (public, `api.php:299`) → `PlayerLeaderboardController:39` returns **raw** `PlayerProfile::with('user')` models → `user.phone/email` leaked. (c) `GET /terrains/{id}/slots` (public, `api.php:301`) → `BookingController::getTerrainSlots` returns booking manager `phone` + team name. | [V] `StadiumDetailsResource.php:20-24`, `PlayerLeaderboardController.php:39-45`, `Terrain/BookingController.php:101-110` | Resource allow-lists (no contact info); phone only to owner/booking manager |

## 3.2 Medium

| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| BE-6 | `EnsureIsAdmin` **ignores `status`** — a blocked admin keeps full admin access. | [V] `EnsureIsAdmin.php:13` | Require `isAdmin() && status==='approved'` |
| BE-7 | **Latent mass assignment:** `Base\Model` defaults `$guarded = []` (`Shared/Base/Model.php:12`); counters/pricing/status in `$fillable`: `PlayerProfile` (points/rating/...), `Team` (points/wins/captain_id/vice_captain_id), `Stadium` (is_open/is_available/rating/reviews_count), `TerrainBooking` (price/total/status/payment_status/receipt_path), `User` (role/status). Today safe only because controllers pass validated whitelists. | [A][V] `Shared/Base/Model.php:12`, `PlayerProfile.php:57-63`, `Team.php:41-51`, `TerrainBooking.php:31-51`, `User.php:31` | Base `$guarded = ['*']`; keep counters/role/status out of `$fillable` |
| BE-8 | **Auth weaknesses:** registration password `min:6` (`RegisterRequest`, `RegisterPlayerRequest`, `AuthController.php:212`) while profile update enforces `min:8`; `updateProfile` (**[V]** `AuthController.php:142-168`) changes email/phone/password **without current-password check**; `phone` lacks `unique` on update (login resolves by phone `AuthController.php:75` → **account hijack vector**); email change not re-verified. | [A][V] | `Password::defaults()` everywhere; current-password gate; `unique:users,phone,<id>`; email re-verify + notify |
| BE-9 | **No rate limiting on write endpoints** (chat, comments, reviews, notifications, bulk admin) — only login/register throttled `5,1`. | [V] `routes/api.php:72-75` | `throttle:` on social/chat/review writes + per-user limits |
| BE-10 | **Mercenary win attribution bug:** mercenary credited `wins`/`points` whenever the host wins regardless of which side they played. | [A] `MatchResultController.php:248-256` | Compare mercenary's team vs winning side |
| BE-11 | `submitScore` scores only `integer\|min:0` (1000–0 possible); the "1h past" rule is checked at submit but not re-checked at `confirmScore`. | [A] `MatchResultController.php:59-62` | Cap scores (`max:99`); re-check `match_datetime` on confirm |
| BE-12 | **Orphan match requests:** `MatchRequestController::store` creates the `MatchRequest` (line 95) then returns 422 if terrain is closed (line 107) — orphaned "open" requests remain in feeds. | [A][V] `MatchRequestController.php:95-111` | Validate terrain before insert, or wrap in transaction |
| BE-13 | Same manager can create a **second overlapping booking** on a slot they already hold (`excludeManagerId` used in conflict check, not re-checked before create). | [A] `MatchRequestController.php:118-124,137` | `checkConflict` without exclusion inside the transaction |
| BE-14 | **No password reset / email verification flows** exist (`email_verified_at` never set). | [A][V] `routes/api.php` | Add reset + verify |

## 3.3 Low / Informational
| # | Finding | Evidence |
|---|---------|----------|
| BE-15 | Login returns distinct messages for pending/rejected/blocked → **account-status enumeration**. | [V] `AuthController.php:86-102` |
| BE-16 | `FollowController` has **no policy** (self-follow possible, minor spam). | [A] `Domains/Social/Controllers/FollowController.php` |
| BE-17 | Admin endpoints serialize **full User models** (email/phone; any future sensitive column leaks). | [A] `ManagerApprovalController.php:50,85`, `PlayerApprovalController.php:44,79` |
| BE-18 | `env('FRONTEND_URL')` used outside config → `null` under `config:cache` (broken approval URL). | [A] `AuthController.php:266` |
| BE-19 | No security headers middleware (CSP/nosniff/referrer). | [A] `bootstrap/app.php` |
| BE-20 | Mojibake Arabic error string in `TerrainBooking::getConflictMessage()` (encoding corruption). | [A] `TerrainBooking.php:273-274` |
| BE-21 | Perf: `ActivityLogController` uses `whereHasMorph + LIKE` on large table; `Setting::get()` query per call (used per-request by gallery); `NotificationController::index` extra unread-count query. | [A] |

### Verified OK [X] — no action
- All booking/query controllers scope by `manager_id`/`owner_id`/`team_id`; owner calendar/slot-closure/owner-booking ownership checks present.
- V1 booking `confirm` uses `Stadium::lockForUpdate()` in a transaction; `CancellationService` locks the booking row; `MatchFeedController::accept` + `respondToChallenge` lock the `MatchRequest` row (no double-accept).
- Score submit/confirm/dispute all verify team membership; player `respond` locks the match + guards `mercenary_player_id`; manager `respond` declines all other pending applicants.
- Policies wired for chat (update/delete/pin), reviews, comments, reactions, reports, gallery, attendance, availability, captaincy, bookings.
- Uploads: consistent `image + mimes:jpeg,png,jpg,webp + size cap`, random storage names, SVG disallowed (no stored-XSS), no path-traversal vector.
- Admin bulk actions scoped by `role` (cannot bulk-approve admins).

---

# 4. API AUDIT (routes · resources · shapes)

## 4.1 Route surface (445 lines) — coverage map
- **Public:** `/register*` `/login` (throttle 5,1) · `/health` · `/stadiums` · `/terrains/public` · `/leaderboard` · `/leaderboard/players` · `/terrains/{id}/slots` · `/facilities` · `/settings/public` · **`v1/*`**: `/home`, `/stadiums`, `/stadiums/{s}`, `/matches`, `/live-matches`, `/leaderboard`, `/stats`, `/live`, `/live/{m}`, `/live/{m}/chat`, `/teams/{t}/page`, `/feed`, `/comments`, `/reviews`, `/competitions*`.
- **Auth:sanctum:** `/logout` `/me` (GET/PUT), `/notifications*`, social writes, chat writes, reviews writes, `v1/bookings*`.
- **manager.approved:** `/manager/my-match-requests|received-challenges|match-requests|challenges|match-feed|team-profile|teams|matches|players|bookings|terrains|recruitment|direct-bookings`.
- **player.approved:** `/player/profile|match-feed|matches|applications|stats`.
- **terrain.owner:** `/owner/terrains*|bookings*|stats|cancellation-requests|slot-closures`.
- **admin:** `/admin/managers|players|terrain-owners|stats|activities|settings|moderation|facilities`.

## 4.2 API findings

### HIGH
| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| API-1 | **`GET /v1/stats` shape mismatch — all counters render `…`.** Backend returns `{ "data": {...} }` (StatsController wraps the resource in `data`), but `landing/liveStatus.jsx:40` and `matches/stats.jsx:23` read `.then(r=>r.data)` then `values.teams/...` → `undefined`. | [V] `StatsController.php:18-20`; `liveStatus.jsx:40-54`; `matches/stats.jsx:23-30,44` | `.then((r) => r.data.data)` in both consumers |
| API-2 | **Manager "cancel booking" calls a route that does not exist.** `BookingsPanel.jsx:19` → `DELETE /manager/bookings/{id}`; backend has only GET list, POST `request-cancel`, POST `training`, GET `my-reservations`. Cancel always fails. | [V] `BookingsPanel.jsx:19`; `api.php:393-397` | `POST /manager/bookings/{id}/request-cancel` |
| API-3 | **Global search "ملاعب" ignores the typed query.** Frontend sends `/v1/stadiums?search=…` (`GlobalSearch.jsx:42`); `StadiumQuery::applyFilters` only reads **`q`** → group shows top stadiums regardless of input. | [V] `GlobalSearch.jsx:42`; `StadiumQuery.php:24-31` | Send `q`, or add `search` alias in the query |

### MEDIUM / LOW
| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| API-4 | Med | **No rate limiting on any public `v1/*` or `/leaderboard*`/`/terrains/*/slots` endpoint** (only auth throttled). | `api.php:72-75` |
| API-5 | Med | **Sanctum tokens never expire** (`config/sanctum.php` `'expiration' => null`) — stolen bearer tokens live until logout. | `config/sanctum.php:53` |
| API-6 | Low | **Dead duplicate endpoints:** non-v1 `/leaderboard` (`Public\LeaderboardController`, flat `{teams,...}`) and `/leaderboard/players` both unused by simpleFrontend; `/v1/live` vs `/v1/live-matches`; duplicated query classes `LiveMatchQuery`/`LiveMatchesQuery`. | [V][A] `api.php:85,298,299`; `api.php:84,88` |
| API-7 | Low | `LeaderboardRow` renders `row.id` as the rank (shows team DB id, not rank) — `toLeaderboardRow` falls back `r.rank ?? r.id` ([V] `adapters.js:128`), so podium highlights wrong rows. | [V] `leaderboardRow.jsx:54` |
| API-8 | Low | `payments` has no public route; receipt/`payment-intent` endpoints exist but frontend never calls them (cash-flow feature unused). | [A] |

### Verified OK [X] — API
- `/v1/home` → `{data:{latest_matches, top_stadiums}}`, consumed correctly as `r.data.data` ([V] `landing/matches.jsx:134`, `availableFields.jsx:109`).
- `/v1/leaderboard` → `{data:[...], meta}` with `rank` per row ([V] `Domains\Leaderboard\LeaderboardController.php`) — consumed correctly; **not** broken (the flat `{teams}` shape is the unused non-v1 duplicate).
- `/v1/matches`, `/v1/live-matches`, `/v1/stadiums` list `{data, meta}` consumed correctly; landing `city` filter works ([V] `searchResults.jsx:201`).
- `/v1/stadiums` `q` search works when used.
- All manager/player/owner/admin/notification endpoints match their frontend consumers ([A] endpoint-consumption table verified).

---

# 5. FRONTEND AUDIT

## 5.1 API-linking bugs (cross-cutting)
| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| FE-1 | High | `/v1/stats` double-wrapper (see API-1) — landing hero stats + Community Stats all `…`. | `liveStatus.jsx:40`, `stats.jsx:23` |
| FE-2 | High | Cancel-booking dead route (see API-2). | `BookingsPanel.jsx:19` |
| FE-3 | Med | Stadium search param mismatch (see API-3). | `GlobalSearch.jsx:42` |
| FE-4 | Med | **Team `level` always shows "good".** `adapters.js:1,10` uses a **5-value** list `beginner/intermediate/good/veryGood/excellent`, backend team level is a free string and never set on register; player profile uses a **4-value** enum `beginner/amateur/semi_pro/pro`. Every landing match card shows `good`. | [V] `adapters.js:1-11,86,118`; `AuthController::register` |
| FE-5 | Low | Dead nested reads: `RecruitmentPanel.jsx`/`GlobalSearch.jsx` read `r.player_profile?.avatar_url/full_name/city` but backend returns flat PlayerProfile + `user` relation → avatar/city never display. | [A] `RecruitmentPanel.jsx:34,40-42,56`, `GlobalSearch.jsx:75` |

## 5.2 Auth / routing
- **OK [X]:** `ProtectedRoute`/`GuestRoute` enforce role + status client-side; `App.jsx` sets `<html dir/lang>`; axios client attaches Bearer from `localStorage['auth_token']`, 401 interceptor clears storage + redirects; `/login`+`/register` exempt. (Client-side guards are cosmetic — real enforcement is backend middleware, which is present.)

## 5.3 i18n / RTL
| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| FE-6 | Med | **Hardcoded Arabic strings** in player/manager/terrain dashboards and landing (e.g. `player/feed`, `BookingsPanel.jsx:17,20,23`, `ApprovalList`) bypass i18n — inconsistent with `locales/*`. | [V] |
| FE-7 | Low | `terrain/calendar/index.jsx:121` `<ChevronRight className="rotate-180">` hardcodes direction — wrong in RTL (rest of app uses `rtl:rotate-180`). | [A] |
| FE-8 | Low | `fields/searchPanel.jsx:62` `md:divide-x` renders dividers on the wrong edge in RTL. | [A] |

## 5.4 Accessibility
| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| FE-9 | Med | **No modal/drawer/sheet uses `role="dialog"` / `aria-modal` / focus trap** (grep = 0 matches). Overlays (GlobalSearch, BookingDrawer, Drawer, searchResults, admin modals) give screen readers no context; only GlobalSearch handles Escape. | [A][V] `src/components/**` |
| FE-10 | Low | Icon-only buttons without `aria-label`; inputs without labels (forms rely on placeholders). | [A] |

## 5.5 UX
| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| FE-11 | **High** | **Player dashboard is white-on-white.** `player/feed/index.jsx:47-48` (+ `player/matches`, `player/applications`, modal fields) use `text-white`/`text-white/50` inside the shared `Card` = `bg-white` (`components/dashboard/ui.jsx:6`) → team name/info invisible. Player screens styled dark but use light cards. | [V] `player/feed/index.jsx:47-48`; `ui.jsx:6` |
| FE-12 | Med | Low-contrast auxiliary text (`text-slate-400` on white, `text-white/40`). | [V][A] |
| FE-13 | Low | Duplicate toast implementations (bespoke inline toast in `player/feed` vs shared `Toast`). | [V] |
| FE-14 | Low | Hardcoded Arabic in dashboards (see FE-6). | [V] |

## 5.6 Performance
| # | Severity | Finding | Evidence |
|---|----------|---------|----------|
| FE-15 | Med | **Terrain overview fan-out:** `terrain/components/bookingsData.js` issues one HTTP GET per (terrain, week) to `/owner/terrains/{id}/calendar` — 7 weeks × terrains for upcoming, ~12×4-5×terrains for revenue (~up to **180 requests/page**). | [A] |
| FE-16 | OK | Main bundle ≈ 502 kB after earlier perf refactor; build + lint green. | [X] (prior session) |

---

# 6. CROSS-CUTTING: dependency & config health
| # | Severity | Finding | Evidence | Fix |
|---|----------|---------|----------|-----|
| DEP-1 | High | **`composer audit`: 8 advisories** — `guzzlehttp/guzzle` (CVE-2026-69246 high, CVE-2026-69245 med), `league/commonmark` (CVE-2026-71488 high quadratic-Markdown DoS + 3 high + 1 med). | [V] | `composer update guzzlehttp/guzzle league/commonmark` + re-audit |
| DEP-2 | OK | `npm audit`: 0 vulnerabilities. | [V] | — |
| DEP-3 | Med | `.env`: `APP_ENV=local`, `APP_DEBUG=true`, `MAIL_MAILER=log` — deployment-checklist risk (stack-trace leakage if shipped). | [V] | Production env override |
| DEP-4 | Med | CORS `allow_all_headers` + `supports_credentials=true` with `FRONTEND_URL` origin; Bearer flow used (cookies not), credentials flag unnecessary — acceptable but tighten for prod. | [V] `config/cors.php` |

---

# 7. TOP PRIORITY ACTION PLAN

**P0 — Security (this week):**
1. Chat: gate `GET /v1/live/{match}/chat` + enforce match membership in `MatchChatPolicy::send/mute`. (BE-4)
2. PII: strip `owner.phone` from `StadiumDetailsResource`, replace raw `PlayerLeaderboardController` dump with a resource, drop `manager.phone` from public slots. (BE-5)
3. Revoke tokens on block + approved-status global guard; `EnsureIsAdmin` status check. (BE-2, BE-6)
4. Scope `LiveMatchController` team/player ids to the match. (BE-3)
5. `composer update` to clear DEP-1.

**P1 — Correctness:**
6. Fix `/v1/stats` consumers (2 lines). (API-1)
7. Fix manager cancel-booking route + stadium search param. (API-2, API-3)
8. Kill TOCTOU double-booking on non-V1 paths with terrain-row locks. (BE-1)

**P2 — Quality:**
9. Player dashboard contrast (white-on-white). (FE-11)
10. Align `level` vocab (5 vs 4 values) — FE-4; add team level field.
11. Dialog roles + focus trap; RTL chevron; i18n extraction. (FE-6/7/9)
12. Password policy `min:8` + current-password + phone unique. (BE-8)

**P3 — DB consolidation (backlog):**
13. Team-delete cascade protection (DB-H1); single player-match-stats table (DB-H2); leaderboard counter sync (DB-H3); notifications consolidation (DB-C1); unique-constraint bypasses (DB-H4/H5).

**P4 — Performance:**
14. Terrain analytics aggregate endpoint (FE-15); settings caching; activity-log index (BE-21).

---

*All findings above were produced from source inspection (not a running instance). Items marked [V] were directly verified during this audit; [A] were produced by a sub-agent and cross-checked; [X] were confirmed working. Before fixing, re-verify runtime behavior of [A]/[X] items on a running environment.*
