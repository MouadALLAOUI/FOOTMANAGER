# 📋 Comprehensive Manager Role System Audit (Full-Stack)
**Platform:** FootMANAGER ("Aji Nqsro")  
**Role Target:** `manager` (مسير الفريق)  
**Date:** September 2026  
**Scope:** Backend (Laravel 12 API, Domain Layers, Routes, Middlewares, Database) & Frontend (`simpleFrontend/`, React 18, Vite, Tailwind CSS, RTL Arabic).

---

## 1. Executive Summary & Architecture Overview

The Manager Role represents the core operational persona in FootMANAGER. A manager owns and directs a single football team (`Team`), schedules friendly matches ("amical"), books terrains and manages weekly subscriptions, arranges tactical pitch formations, recruits free agents, joins tournaments, reports scores, and tracks team analytics.

### Current Dual-Architecture State
The system exhibits an architectural evolution with two parallel layers:
1. **Layer 1: Pragmatic REST Controller Layer (`/api/manager/*`)**  
   - Handled primarily by `App\Http\Controllers\Manager\*` and `App\Http\Controllers\Terrain\BookingController`.
   - Protected by middleware `auth:sanctum`, `manager.approved`, `module.maintenance:*`, and `activity.not_locked`.
   - Directly used by most screens in `simpleFrontend/src/pages/manager/`.
2. **Layer 2: Domain-Driven Design (DDD) V1 Layer (`/api/v1/manager/team/*` & `/api/v1/*`)**  
   - Handled by `App\Domains\Team\*`, `App\Domains\Match\*`, and `App\Domains\Booking\*`.
   - Powers advanced statistics, live match clocks/events, and centralized fixture histories.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   simpleFrontend/src/pages/manager/                    │
│   Overview | Matches | Feed | Formations | Players | Bookings | ...   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       [/api/manager/* Endpoints]         [/api/v1/manager/team/* Endpoints]
     - MatchRequestController            - TeamStatisticsController
     - MatchFeedController               - TeamFixtureController
     - MatchResultController             - LiveMatchController
     - ManagerLineupController           - TeamFormationController
     - TeamProfileController             - V1BookingController
     - PlayerController & Membership
     - BookingController (Terrain)
     - TournamentController
```

---

## 2. Complete Backend Endpoint Catalog

All routes require `auth:sanctum` and `manager.approved` (plus optional rate limits and module maintenance gates).

### 2.1 Friendly Matches & Challenge System
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/my-match-requests` | `MatchRequestController@index` | `module.maintenance:matches` | Retrieves paginated match requests created or joined by manager's team. Query params: `status`, `per_page`. |
| `GET` | `/api/manager/received-challenges` | `MatchRequestController@receivedChallenges` | `module.maintenance:matches` | Retrieves paginated direct challenges sent to manager's team. Query params: `per_page`. |
| `POST` | `/api/manager/match-requests` | `MatchRequestController@store` | `activity.not_locked`, `throttle:match` | Creates an open friendly match request. Body: `stadium_id`, `custom_terrain_name`, `match_datetime`, `start_time`, `end_time`, `reservation_type`, `day_of_week`, `start_date`, `end_date`, `notes`, `price_per_player`, `needs_players`, `players_needed`, `positions_needed`. Also creates a `TerrainBooking` if `stadium_id` is supplied. |
| `POST` | `/api/manager/challenges` | `MatchRequestController@sendChallenge` | `activity.not_locked`, `throttle:match` | Sends a direct friendly match challenge to a specific team (`target_team_id`). Body includes datetime, stadium/custom terrain, notes, player recruitment needs. |
| `PUT` | `/api/manager/challenges/{id}/respond` | `MatchRequestController@respondToChallenge` | `activity.not_locked`, `throttle:match` | Accepts or declines a received challenge. Body: `action` (`accept` or `decline`), `needs_players`, `players_needed`. Validates schedule conflicts on acceptance. |
| `DELETE` | `/api/manager/match-requests/{id}` | `MatchRequestController@destroy` | `activity.not_locked`, `throttle:match` | Cancels an open match request. Associated pending terrain booking is released. |
| `POST` | `/api/manager/match-requests/{id}/start` | `MatchRequestController@start` | `activity.not_locked`, `throttle:match` | Sets match status to `live` once kickoff time arrives. |
| `POST` | `/api/manager/match-requests/from-booking/{bookingId}` | `MatchRequestController@createFromBooking` | `activity.not_locked`, `throttle:booking` | Converts an existing approved terrain booking into an open friendly match request. |

### 2.2 Match Market (Feed)
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/match-feed` | `MatchFeedController@index` | `module.maintenance:matches` | Lists available open match requests from other teams. Filters: `city`, `player_format`, `stadium_id`, `date`, `level`, `search`. |
| `POST` | `/api/manager/match-requests/{id}/accept` | `MatchFeedController@accept` | `activity.not_locked`, `throttle:match` | Joins/accepts an open match request from the market. Verifies subscription limits, team conflicts, locks terrain booking. |

### 2.3 Scores, Results & Disputes
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/matches/pending-scores` | `MatchResultController@pendingScores` | `module.maintenance:matches` | Lists matches completed $\ge 1\text{ hour}$ ago where score status is `none` or `disputed`. |
| `GET` | `/api/manager/matches/pending-confirmations` | `MatchResultController@pendingConfirmations` | `module.maintenance:matches` | Lists matches where the opponent submitted a score waiting for manager's confirmation. |
| `POST` | `/api/manager/matches/{id}/submit-score` | `MatchResultController@submitScore` | `activity.not_locked`, `throttle:match` | Submits score (`host_score`, `opponent_score`). Sets status to `pending_confirmation`. |
| `POST` | `/api/manager/matches/{id}/confirm-score` | `MatchResultController@confirmScore` | `activity.not_locked`, `throttle:match` | Confirms reported score. Updates team leaderboard stats (wins, draws, losses, goals for/against, points). |
| `POST` | `/api/manager/matches/{id}/dispute-score` | `MatchResultController@disputeScore` | `activity.not_locked`, `throttle:match` | Flags match score as disputed, resetting for correction. |

### 2.4 Match Lineups & Roles
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/match-requests/{matchRequestId}/lineup` | `ManagerLineupController@index` | `module.maintenance:matches` | Retrieves match tactical lineup, starters, substitutes, and formation. |
| `GET` | `/api/manager/match-requests/{matchRequestId}/lineup/roster` | `ManagerLineupController@roster` | `module.maintenance:matches` | Squad roster available for assignment in this match. |
| `PUT` | `/api/manager/match-requests/{matchRequestId}/lineup` | `ManagerLineupController@update` | `activity.not_locked` | Bulk saves starter/bench assignments with normalized pitch coordinates `(x, y)`, tactical roles, and formation preset. |
| `PUT` | `/api/manager/match-requests/{id}/lineup/captain` | `ManagerLineupController@setCaptain` | `activity.not_locked` | Assigns team captain for match. Body: `player_id`. |
| `PUT` | `/api/manager/match-requests/{id}/lineup/vice-captain` | `ManagerLineupController@setViceCaptain` | `activity.not_locked` | Assigns vice-captain. Body: `player_id`. |
| `PUT` | `/api/manager/match-requests/{id}/lineup/free-kick` | `ManagerLineupController@setFreeKickTaker` | `activity.not_locked` | Assigns free kick taker. Body: `player_id`. |
| `PUT` | `/api/manager/match-requests/{id}/lineup/penalty` | `ManagerLineupController@setPenaltyTaker` | `activity.not_locked` | Assigns penalty taker. Body: `player_id`. |
| `PUT` | `/api/manager/match-requests/{id}/lineup/corner` | `ManagerLineupController@setCornerTaker` | `activity.not_locked` | Assigns corner kick taker. Body: `player_id`. |

### 2.5 Team Profile & Formations
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/team-profile` | `TeamProfileController@show` | `module.maintenance:teams` | Fetches manager's team profile, home stadium, colors, category, contact info. |
| `PUT` | `/api/manager/team-profile` | `TeamProfileController@update` | `activity.not_locked`, `throttle:upload` | Updates team details (name, category, association_name, primary_stadium_id, city, region, primary/secondary colors). |
| `POST` | `/api/manager/team-profile/logo` | `TeamProfileController@uploadLogo` | `activity.not_locked`, `throttle:upload` | Uploads image file (`jpeg,png,jpg,webp`), generates thumbnail. |
| `POST` | `/api/manager/team-profile/logo-preset` | `TeamProfileController@applyLogoPreset` | `activity.not_locked`, `throttle:upload` | Applies an admin-provided system team logo preset (`preset_id`). |
| `GET` | `/api/manager/team/formations` | `TeamFormationController@index` | `module.maintenance:teams` | Lists saved team tactical pitch formations. |
| `GET` | `/api/manager/team/formation-presets` | `TeamFormationController@presets` | `module.maintenance:teams` | Retrieves standard system tactical presets (5v5 to 11v11). |
| `POST` | `/api/manager/team/formations` | `TeamFormationController@store` | `activity.not_locked` | Creates a new saved tactical formation. |
| `GET` | `/api/manager/team/formations/{formation}` | `TeamFormationController@show` | `module.maintenance:teams` | Fetches a single tactical formation. |
| `PUT` | `/api/manager/team/formations/{formation}` | `TeamFormationController@update` | `activity.not_locked` | Updates tactical slots and coordinates of a formation. |
| `DELETE` | `/api/manager/team/formations/{formation}` | `TeamFormationController@destroy` | `activity.not_locked` | Deletes a saved formation. |
| `GET` | `/api/manager/teams/{id}` | `PublicTeamController@show` | `module.maintenance:teams` | Public manager view of an opponent team with recent matches. |

### 2.6 Squad Players & Team Membership
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/players` | `PlayerController@index` | `module.maintenance:players` | Lists all players in team squad (both manual and linked users). |
| `POST` | `/api/manager/players` | `PlayerController@store` | `activity.not_locked` | Creates a manual squad player (`name`, `position`, `number`, `phone`, `is_whatsapp`, `notes`). |
| `PUT` | `/api/manager/players/{id}` | `PlayerController@update` | `activity.not_locked` | Updates squad player details. |
| `DELETE` | `/api/manager/players/{id}` | `PlayerController@destroy` | `activity.not_locked` | Removes player from squad. |
| `GET` | `/api/manager/team-members` | `TeamMembershipController@index` | `module.maintenance:players` | Lists active permanent registered platform players in team. |
| `GET` | `/api/manager/team-members/essential` | `TeamMembershipController@essential` | `module.maintenance:players` | Lists essential players earmarked for tournament squads. |
| `POST` | `/api/manager/team-members` | `TeamMembershipController@addMember` | `activity.not_locked` | Adds an approved user with `role=player` to team squad. |
| `DELETE` | `/api/manager/team-members/{id}` | `TeamMembershipController@removeMember` | `activity.not_locked` | Soft-removes platform user from team (preserves match history). |
| `PUT` | `/api/manager/team-members/{id}/essential` | `TeamMembershipController@toggleEssential` | `activity.not_locked` | Toggles `is_essential` flag for tournament eligibility. |
| `PUT` | `/api/manager/team-members/{id}/position` | `TeamMembershipController@changePosition` | `activity.not_locked` | Updates player field position. |

### 2.7 Terrain Bookings & Recurring Abonnements
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/bookings` | `BookingController@getManagerBookings` | `module.maintenance:bookings`, `throttle:booking` | Lists manager's bookings with filter tabs (`upcoming`, `past`, `cancelled`, `all`) and subscription stats. |
| `GET` | `/api/manager/terrains/{terrainId}/my-reservations` | `BookingController@myReservations` | `module.maintenance:bookings` | Lists upcoming reservations on a specific terrain. |
| `POST` | `/api/manager/bookings/{bookingId}/request-cancel` | `BookingController@requestCancel` | `activity.not_locked` | Submits cancellation request to terrain owner with reason. |
| `POST` | `/api/manager/bookings/training` | `BookingController@createTrainingBooking` | `activity.not_locked` | Creates single or weekly subscription booking for team training. |
| `POST` | `/api/manager/direct-bookings` | `DirectBookingController@store` | `activity.not_locked` | Direct pitch reservation creation. |

### 2.8 Recruitment & Player Applications
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/recruitment/search` | `PlayerRecruitController@search` | `module.maintenance:recruitment` | Searches approved free agent players. Filters: `city`, `position`, `skill_level`, `search`. |
| `POST` | `/api/manager/recruitment/{playerId}/invite` | `PlayerRecruitController@invite` | `activity.not_locked`, `throttle:team-request` | Invites a player to join an open match request. |
| `GET` | `/api/manager/matches/{matchId}/applicants` | `PlayerRecruitController@applicants` | `module.maintenance:matches` | Lists player applications received for a match. |
| `PUT` | `/api/manager/recruitment/applications/{applicationId}/respond` | `PlayerRecruitController@respond` | `activity.not_locked`, `throttle:team-request` | Accepts or declines a player application for a match. |

### 2.9 Tournaments
| Method | Endpoint | Controller Action | Middleware / Throttles | Description & Request Parameters |
|---|---|---|---|---|
| `GET` | `/api/manager/tournaments` | `ManagerTournamentController@index` | `module.maintenance:tournaments` | Lists active tournaments open for registration. |
| `POST` | `/api/manager/tournaments/{tournament}/register` | `ManagerTournamentController@register` | `activity.not_locked` | Registers manager's team in tournament. |
| `DELETE` | `/api/manager/tournaments/{tournament}/register` | `ManagerTournamentController@cancel` | `activity.not_locked` | Withdraws team registration (before draw is confirmed). |
| `GET` | `/api/manager/tournaments/{tournament}/squad` | `ManagerTournamentSquadController@index` | `module.maintenance:tournaments` | Lists tournament squad roster and locked essential status. |
| `PUT` | `/api/manager/tournaments/{tournament}/squad/{playerId}` | `ManagerTournamentSquadController@toggle` | `activity.not_locked` | Toggles player inclusion in tournament squad. |

### 2.10 Domain Layer V1 Endpoints (`/api/v1/*`)
| Method | Endpoint | Controller Action | Middleware | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/manager/team/statistics` | `TeamStatisticsController@index` | `manager.approved`, `module.maintenance:teams` | Advanced team analytics (requires `advanced_statistics` subscription). Params: `from`, `to`, `group_by`. |
| `GET` | `/api/v1/team/fixtures/history` | `TeamFixtureController@history` | `manager.approved` | Historical matches, scores, and results. |
| `GET` | `/api/v1/team/fixtures/upcoming` | `TeamFixtureController@upcoming` | `manager.approved` | Upcoming fixtures. |
| `POST` | `/api/v1/manager/team/attendance` | `V1AttendanceController@store` | `activity.not_locked` | Records training/match attendance for squad players. |
| `POST` | `/api/v1/live/{match}/start` | `LiveMatchController@start` | `activity.not_locked`, `throttle:match-live` | Starts live match clock. |
| `POST` | `/api/v1/live/{match}/finish` | `LiveMatchController@finish` | `activity.not_locked`, `throttle:match-live` | Finishes live match. |
| `POST` | `/api/v1/live/{match}/events` | `LiveMatchController@storeEvent` | `activity.not_locked`, `throttle:match-live` | Records live match event (goal, assist, yellow card, red card, sub). |
| `POST` | `/api/v1/live/{match}/mvp` | `LiveMatchController@awardMvp` | `activity.not_locked` | Awards Man of the Match (MVP) to a player. |

---

## 3. Frontend Architecture & Screen Mapping (`simpleFrontend/`)

The manager frontend is structured under `simpleFrontend/src/pages/manager/`, with centralized drawer modals in `components/CommandCenterDrawers.jsx` and domain components in `src/domains/manager/components/`.

```
simpleFrontend/src/pages/manager/
├── index.jsx                  # Root Layout / Shell with Manager Navigation Tabs
├── overview/                  # Command Center Dashboard
│   ├── index.jsx
│   └── (Integrates TodayPanel, QuickBooking, MatchMarket, BookingsPanel, RecruitmentPanel)
├── matches/index.jsx          # Match management (Open, Confirmed, Live, Finished, Scores)
├── feed/index.jsx             # Friendly Match Market & Radar Filter
├── formation/                 # Tactical Pitch Editor (5v5 to 11v11, slots, roles)
│   ├── index.jsx
│   ├── FootballPitch.jsx
│   ├── PlayerCard.jsx
│   └── pitchUtils.js
├── players/index.jsx          # Squad roster CRUD, position donut, contact info
├── bookings/index.jsx         # Field reservations (Single & Weekly subscriptions)
├── recruitment/index.jsx      # Free agent radar search, invites, match applicants
├── tournaments/index.jsx      # Tournament registrations & squad toggles
├── analytics/index.jsx        # Performance metrics, Recharts trends, form indicators
├── profile/index.jsx          # Manager account & credentials
├── settings/index.jsx         # Notifications & preferences
└── components/                # 15 Manager-specific widgets & drawers
```

### Screen to Endpoint Matrix

| Screen / Page | Primary Endpoints Called | State & Query Management | Key UI Interactions |
|---|---|---|---|
| **Overview** (`overview/index.jsx`) | `/manager/my-match-requests`, `/manager/bookings`, `/manager/received-challenges`, `/v1/manager/team/statistics` | `CommandCenterContext`, `useMatchRequests`, `useManagerBookings`, `useChallenges` | Quick booking time-slot trigger, today's schedule countdown, pending score alerts, quick match challenge modal, recent activity feed. |
| **Matches** (`matches/index.jsx`) | `/manager/my-match-requests`, `/manager/matches/pending-scores`, `/manager/matches/pending-confirmations`, `/manager/match-requests/{id}/start`, `/manager/match-requests/{id}` | `useApi`, `useState` for tabs (`all`, `accepted`, `open`, `live`, `completed`, `pending_confirmation`) | Status tab filtering, score submission modal (`ScoreModal`), score confirmation/dispute buttons, kickoff match button, lineup drawer trigger. |
| **Match Market** (`feed/index.jsx`) | `/manager/match-feed`, `/v1/stadiums`, `/cities/select`, `/manager/match-requests/{id}/accept` | `useApi`, `useSearchParams` | Radar city filter, player format filter, date range, challenge acceptance modal with `needs_players` counter. |
| **Tactical Pitch** (`formation/index.jsx`) | `/manager/team/formations`, `/manager/team/formation-presets`, `/manager/players` | `useTeamFormations`, `useFormationPresets`, `useManagerPlayers`, TanStack Query | 1,310-line interactive pitch canvas, formation switcher (5v5–11v11), drag-and-drop starter/sub coordinates, role badges (C, VC, FK, PEN, CRN). |
| **Players** (`players/index.jsx`) | `/manager/players`, `/manager/team-members` | `useManagerPlayers`, `@tanstack/react-virtual` | Squad virtualization, position distribution donut, WhatsApp click-to-chat, add/edit player modal, squad number assignment. |
| **Bookings** (`bookings/index.jsx`) | `/manager/bookings`, `/v1/stadiums`, `/manager/bookings/{id}/request-cancel`, `/manager/bookings/training` | `useManagerBookings`, `useTerrainSlots` | Single match vs weekly subscription ("abonnement"), slot time picker, cancel request dialog with reason. |
| **Recruitment** (`recruitment/index.jsx`) | `/manager/recruitment/search`, `/manager/recruitment/{id}/invite`, `/manager/matches/{id}/applicants` | `useRecruitment`, `useMatchRequests` | Free agent scouting radar, position/level filters, invite player modal with match selector, applicant decision buttons. |
| **Tournaments** (`tournaments/index.jsx`) | `/manager/tournaments`, `/manager/tournaments/{id}/register`, `/manager/tournaments/{id}/squad` | `useApi` | Tournament registration flow, draw confirmation status, essential players roster lock modal (`EssentialPlayersModal`). |
| **Analytics** (`analytics/index.jsx`) | `/v1/manager/team/statistics`, `/v1/team/fixtures/history`, `/manager/team-profile` | `useApi` | Date range presets (`today`, `7d`, `30d`, `3m`, `year`), goals scored/conceded AreaTrend, win/draw/loss Donut, form badges. |
| **Profile & Settings** (`profile/`, `settings/`) | `/me`, `/me/avatar`, `/notifications/preferences`, `/push-subscriptions` | `useMe`, `useNotificationPrefs` | Profile avatar upload, password update, Web Push notification activation banner. |

---

## 4. Security, Roles & Business Rules

### 4.1 Approval Pipeline
```
Registration (Manager) ──► status = 'pending' (Blocked from /manager/*)
                                  │
                                  ▼ (Admin reviews in Admin Dashboard)
                         status = 'approved'
                                  │
                                  ▼
                     Access granted via EnsureManagerApproved
```
- **Middleware Guard:** `EnsureManagerApproved.php` strictly verifies:
  1. User is authenticated (`auth:sanctum`).
  2. User role is exactly `'manager'`.
  3. User status is exactly `'approved'` (returns HTTP 403 with descriptive Arabic alert for `pending`, `rejected`, or `blocked`).

### 4.2 Activity Locking (`activity.not_locked`)
- When an administrative dispute, chargeback, or policy violation occurs, an admin can lock a manager's account activity (`lockActivity`).
- The `activity.not_locked` middleware intercepts any modifying requests (`POST`, `PUT`, `DELETE`), preventing changes while still allowing read-only access.

### 4.3 Subscription Quotas & Boundaries
- Checked via `SubscriptionService`:
  - `friendly_match_requests`: Managers on free plans have monthly limits on friendly match creations and acceptances.
  - `advanced_statistics`: Access to `/v1/manager/team/statistics` with custom date filters is gated by plan features.

### 4.4 Conflict Protection Matrix
- When booking or scheduling friendly matches, the backend validates:
  1. **Team Schedule Overlap:** `MatchMembershipService::teamHasMatchConflict` ensures neither team is booked elsewhere at the same time.
  2. **Player Double-Booking:** `MatchMembershipService::teamHasPlayerConflict` warns if a player in the roster is participating in another fixture.
  3. **Terrain Slot Collision:** `TerrainBooking::getConflictMessage` verifies no active single booking or weekly subscription occupies the slot.
  4. **Tournament Fixture Priority:** Tournament bracket matches have exclusive right-of-way over friendly games on competition pitches.

---

## 5. Key Inconsistencies & High-Priority Upgrade Areas

During this comprehensive audit, several critical technical issues and optimization opportunities were uncovered:

### 1. Dual Routing & API Redundancy
* **Issue:** Several endpoints exist twice under different paths and controllers:
  * `/api/manager/team-profile` vs `/api/v1/manager/team`
  * `/api/manager/team/formations` vs `/api/v1/manager/team/formations`
  * `/api/manager/team/formation-presets` vs `/api/v1/manager/team/formation-presets`
* **Impact:** Inconsistent frontend behavior if one endpoint is updated with new validation or eager loading while another screen calls the other endpoint.
* **Recommendation:** Consolidate onto clean canonical route aliases.

### 2. Manual Players vs Platform Users (Squad Model Duality)
* **Issue:** The `Player` table accommodates both manual players (`user_id = null`) and registered app users (`user_id != null`). However:
  * The `players/index.jsx` frontend page currently only supports manual CRUD via `/manager/players`.
  * Inviting or adding an existing registered player via `/manager/team-members` is not surfaced on the squad screen.
  * Essential tournament status (`/manager/team-members/{id}/essential`) is handled separately from regular squad management.
* **Recommendation:** Unify squad management in the UI so managers can easily add manual players OR search and add registered platform players with a single click.

### 3. State Management & Query Cache Inconsistency
* **Issue:** In `simpleFrontend/src/pages/manager/`:
  * Some modules use React Query hooks (`useMatchRequests`, `useTeamFormations`, `useManagerPlayers`, `useTeamProfile`).
  * Other modules use the legacy `useApi()` wrapper (`matches/index.jsx`, `analytics/index.jsx`, `tournaments/index.jsx`, `recruitment/index.jsx`).
* **Impact:** Modifying a match or player in one drawer does not reliably invalidate cache queries in other views, leading to stale data unless the user hard-refreshes.
* **Recommendation:** Migrate all manager screens to TanStack React Query (`queries.js`) with centralized invalidation helpers (`invalidateManager()`).

### 4. Validation Standardisation (Form Requests)
* **Issue:** Several controllers (such as `MatchRequestController`, `MatchResultController`, `PlayerRecruitController`) run inline `$request->validate([...])` with hardcoded Arabic strings instead of dedicated Laravel Form Request classes (`StoreMatchRequest`, `SubmitScoreRequest`, `InvitePlayerRequest`).
* **Recommendation:** Extract validation to Form Requests to adhere to Laravel best practices and enable reusable rules.

### 5. Score Dispute Resolution Workflow
* **Issue:** If an opponent disputes a submitted score (`disputeScore`), the score status is set to `'disputed'`. However, there is no direct dispute arbitration screen for managers or admins—the match simply sits in the disputed tab.
* **Recommendation:** Provide a re-submission prompt for the host manager and an admin moderation hook if the teams cannot agree.

### 6. Real-time Broadcasting Integration
* **Issue:** Match challenges, cancellations, and score notifications use `NotificationService::push` (database + web push), but real-time UI updates (via Laravel Reverb / WebSockets) are not subscribed to in the manager views.
* **Recommendation:** Wire Laravel Echo channels into `CommandCenterContext` to show instant badge counters when an opponent accepts a challenge or submits a score.

---

## 6. Verification & System Health
- `simpleFrontend` compiles cleanly (`npm run build` exits 0 with 0 errors).
- All 13 manager pages render properly with native RTL layout and Arabic locale strings.
- Backend routes are properly protected with role and approval middleware.
