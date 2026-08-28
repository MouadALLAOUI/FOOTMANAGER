# COMPARE.md — simpleFrontend (Web) vs FOOT_MOBILE (Mobile)

> Comparison of the **reworked web frontend** (`simpleFrontend/`) against the **mobile app** (`FOOT_MOBILE/`).
> The mobile app is a **simplified, lower-complexity** version — it is **not** a clone of the web app.
> This document maps every web page/section to its mobile equivalent (built, placeholder, or intentionally out-of-scope),
> then lists **what still needs to be built on mobile**.

---

## 1. TL;DR — What is still needed on Mobile

The following **role group pages** are still **placeholder or missing** on mobile
(currently render a static `EmptyState` or point to the wrong screen). Everything marked ✅ already has a real mobile screen.

| Role group | Page / section | Mobile status |
|---|---|---|
| **Player** | Bookings (list + detail) | ❌ Placeholder (Phase 5.2 was aborted) |
| **Player** | My applications / requests | ❌ Not present |
| **Player** | Team (view team) | ❌ Placeholder |
| **Manager** | Matches (list / detail / create) | ❌ Placeholder |
| **Manager** | Team (list + member/detail) | ❌ Placeholder |
| **Manager** | Bookings (list / detail) | ❌ Placeholder |
| **Manager** | Terrain search | ❌ Placeholder |
| **Manager** | Recruitment / players / analytics / tournaments | ❌ Not present |
| **Admin** | Approvals (manager/owner/committee requests) | ❌ Placeholder |
| **Admin** | Users list / detail | ❌ Placeholder |
| **Admin** | Plans, facilities, cities, moderation, messages, sub-admins, analytics | ❌ Not present |
| **Committee** | Tournaments (list + detail + management) | ❌ Placeholder (detail maps to list) |
| **Terrain** | Bookings (list / detail) | ❌ Placeholder |
| **Terrain** | Fields (list / detail) | ❌ Placeholder |
| **Terrain** | Calendar / cancellations / closures / analytics | ❌ Not present |

Everything else (auth, home, profile, settings, notifications, player matches) is already built.

---

## 2. simpleFrontend web page inventory (per role)

**Public / marketing (static):** landing, about, contact, fields (browse/search), matches (browse + leaderboard), pricing, privacy, terms, tournaments (public showcase).

**Auth:** login, register, forgot-password, reset-password, pending, recovery.

**Admin:** overview, activity, analytics, cities, committees, facilities, managers, messages, moderation, notifications, owners, plans (list/form/editors), players, profile, requests, settings, sub-admins.

**Committee:** notifications, overview, profile, settings, tournaments (detail + `analytics`, `bracket`, `communication`, `content`/`gallery|news|partners|sponsors`, `draw`, `export`, `fixtures`, `match-control-room`, `overview`, `settings`, `standings`, `statistics`, `teams` tabs).

**Manager:** analytics, bookings, feed, matches, notifications, overview, players, recruitment, settings, team, tournaments.

**Player:** applications, feed, match-detail, matches, notifications, overview, profile, requests, settings, team.

**Terrain (owner):** analytics, bookings, calendar, cancellations, closures, notifications, overview, profile, settings, terrains.

---

## 3. FOOT_MOBILE structure

**Route groups:** `(auth)`, `(public)`, `(admin)`, `(committee)`, `(manager)`, `(player)`, `(terrain)`.

**Shared real screens:** `NotificationsScreen`, `ProfileScreen`, `SettingsScreen` (used by all role groups).

**Real, purpose-built screens:**
- Auth flow (login, register, forgot/reset password, account blocked/pending/rejected)
- `PlayerMatchesScreen`, `PlayerMatchDetailScreen` (Player matches, Phase 5.1)
- `PublicHome` + `dev` design system
- `HomeShell` + quick actions per role

**Placeholder screens** (render `EmptyState` / static "no data") — these are the gaps:
`MatchesListScreen`, `MatchDetailScreen`, `CreateMatchScreen`, `TeamScreen`,
`BookingsListScreen`, `BookingDetailScreen`, `TerrainSearchScreen`,
`ApprovalsScreen`, `UsersScreen`, `TournamentsListScreen`, `TournamentDetailScreen`,
`FieldsListScreen`, `FieldDetailScreen`.

> ⚠️ **Route mapping quirk:** several `[id].tsx` detail routes currently re-export the **list** screen
> (e.g. `(manager)/matches/[id]`, `(manager)/team/[id]`, `(committee)/tournaments/[id]`,
> `(terrain)/bookings/[id]`, `(terrain)/fields/[id]`, `(player)/bookings/[id]`).
> They must be split into real **list vs detail** screens when implemented.

---

## 4. Role-by-role comparison

### 4.1 Player
| Web (simpleFrontend) | Mobile | Status |
|---|---|---|
| login / register / forgot / reset | `app/(auth)/*` | ✅ Built |
| overview (Home) | `app/(player)/index` → HomeShell | ✅ Built |
| feed / matches | `app/(player)/matches` (PlayerMatchesScreen) | ✅ Built (Phase 5.1) |
| match-detail | `app/(player)/matches/[id]` | ✅ Built (Phase 5.1) |
| team | `app/(player)/team` → TeamScreen | ❌ Placeholder |
| bookings | `app/(player)/bookings` (list + detail) | ❌ Placeholder (Phase 5.2 aborted) |
| applications / requests | — | ❌ Missing |
| notifications | `app/(player)/notifications` | ✅ Built |
| profile / settings | `app/(player)/profile`, `settings` | ✅ Built |

**Still needed:** Bookings (list + detail), Team (view + roster), My applications/requests (list + status).

### 4.2 Manager
| Web (simpleFrontend) | Mobile | Status |
|---|---|---|
| Home (overview/command-center) | `app/(manager)/index` → HomeShell | ✅ Built |
| matches (create/list) | `app/(manager)/matches` | ❌ Placeholder |
| match detail | `app/(manager)/matches/[id]` | ❌ Placeholder (maps to list) |
| team | `app/(manager)/team` | ❌ Placeholder |
| team detail / member | `app/(manager)/team/[id]` | ❌ Placeholder (maps to list) |
| bookings | `app/(manager)/bookings` | ❌ Placeholder |
| terrain search / browse fields | `app/(manager)/terrain` → TerrainSearchScreen | ❌ Placeholder |
| recruitment / players / analytics / tournaments | — | ❌ Missing |
| notifications / profile / settings | shared screens | ✅ Built |

**Still needed:** Matches (create/list/detail), Team (list + detail/roster), Bookings (list + detail), Terrain search. Deferred/low-priority: recruitment, players, analytics, tournaments.

### 4.3 Admin
| Web (simpleFrontend) | Mobile | Status |
|---|---|---|
| overview | `app/(admin)/index` → HomeShell | ✅ Built |
| approvals / requests | `app/(admin)/approvals` → ApprovalsScreen | ❌ Placeholder |
| users (managers/owners/players) | `app/(admin)/users` → UsersScreen | ❌ Placeholder |
| notifications / profile / settings | shared screens | ✅ Built |
| plans, facilities, cities, committees, moderation, messages, sub-admins, analytics | — | ❌ Missing |

**Still needed:** Approvals (process manager/owner/committee requests), Users (list + detail + manage). Deferred/low-priority: plans, facilities, cities, moderation, messages, sub-admins, analytics.

### 4.4 Committee
| Web (simpleFrontend) | Mobile | Status |
|---|---|---|
| overview | `app/(committee)/index` → HomeShell | ✅ Built |
| tournaments (list) | `app/(committee)/tournaments` | ❌ Placeholder |
| tournament detail + management | `app/(committee)/tournaments/[id]` | ❌ Placeholder (maps to list) |
| notifications / profile / settings | shared screens | ✅ Built |

**Still needed:** Tournaments (list + detail). Deferred/low-priority: tournament sub-modules (standings, fixtures, bracket, teams, content, draw, export, match control room).

### 4.5 Terrain (Owner)
| Web (simpleFrontend) | Mobile | Status |
|---|---|---|
| overview | `app/(terrain)/index` → HomeShell | ✅ Built |
| bookings (list + detail) | `app/(terrain)/bookings` | ❌ Placeholder |
| fields / terrains (list + detail) | `app/(terrain)/fields` | ❌ Placeholder |
| calendar / cancellations / closures / analytics / notifications | — | ❌ Missing (notifications shared ✅) |
| profile / settings | shared screens | ✅ Built |

**Still needed:** Bookings (list + detail), Fields (list + detail). Deferred/low-priority: calendar, cancellations, closures, analytics.

### 4.6 Auth & Public
| Web (simpleFrontend) | Mobile | Status |
|---|---|---|
| login / register / forgot / reset / pending / recovery | `app/(auth)/*` | ✅ Built |
| public landing | `app/(public)/index` | ✅ Minimal built |
| marketing pages (landing, about, pricing, privacy, terms, contact, fields/matches/tournaments showcase) | — | 🚫 Out of scope for simplified mobile app |

---

## 5. Recommended build order (simplified mobile priority)

Player-first, then highest-usage role flows. Backend availability is a precondition for each.

1. **Player Bookings** — list (upcoming/history) + detail + cancel *(Phase 5.2 — currently blocked: no player booking backend; see note below)*.
2. **Player Team** — view team + roster.
3. **Player Applications/Requests** — list + status *(backend `player/applications` and `respond` exist)*.
4. **Manager Matches** — create, list, detail, manage requests.
5. **Manager Team** — roster + detail; **Manager Bookings** — list + detail.
6. **Terrain Bookings + Fields** — list + detail.
7. **Committee Tournaments** — list + detail.
8. **Admin Approvals + Users** — list + manage.
9. *(Deferred):* manager recruitment/analytics/tournaments, admin plans/facilities/cities/moderation/messages/sub-admins, terrain calendar/cancellations/closures, committee tournament sub-modules.

---

## 6. Non-negotiable mobile constraints (do not redesign)

- Mobile is intentionally **simpler** than web — marketing/static pages and many complex admin/committee sub-modules are explicitly **out of scope**.
- Keep established mobile patterns: typed API layer, React Query, domain screen per route, shared UI kit (`ui/*`), shared `Profile`/`Settings`/`Notifications`, i18n (ar/en/fr) + RTL, logical spacing utilities.
- Do **not** create parallel architecture to `simpleFrontend`; the mobile app lives in `FOOT_MOBILE/`.

---

## 7. Notable backend caveat (from prior audit)

- **Player Bookings (Phase 5.2):** the backend has **no player-specific booking system**. The only booking endpoints
  (`GET /bookings/upcoming|history|{id}`, `POST /bookings/{id}/cancel`) are **manager/owner scoped**
  (filtered by `manager_id`, cancel requires `user.id === booking.manager_id`, creation requires `role === 'manager'`).
  Implementing mobile Player Bookings requires a backend player-booking domain first, or reusing the manager booking flow.
