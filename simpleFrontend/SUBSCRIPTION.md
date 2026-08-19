# Subscription System — Internal Documentation

Concise reference for the plans/features/subscription engine. Backend domain lives
under `backend/app/Domains/Subscription/`; the public pricing + admin screens live in
this app (`simpleFrontend/`).

## 1. Plans
- Model `Plan` (`plans` table): name, slug, description, `price` (decimal), `currency`,
  `billing_interval` (`monthly`/`yearly`), `is_free`, `is_active`, `display_order`, `badge`.
- Seeded by `backend/database/seeders/PlanSeeder.php` (idempotent, `updateOrCreate` by slug):
  Bronze (free, 0 MAD), Gold (100 MAD), Platinum (200 MAD). Prices/limits are **data**, not code.
- Plans are ordered by `display_order` (cheapest first). This order drives inheritance.

## 2. Feature system
- `features` table describes features; `plan_features` pivot carries `enabled`, `value`,
  `is_unlimited` per plan. Seeded by `FeatureSeeder` + `PlanFeatureSeeder`.
- Feature `type`: `boolean` (grant) or `limit` (numeric/unlimited allowance).
- The three platform-enforced limits are `friendly_match_requests`, `terrain_limit`,
  `tournament_limit`. Other features are boolean grants used by controllers/UI.

## 3. Limits resolution
All resolution is centralized in `SubscriptionService`:
- `getCurrentPlan(User)` — plan of the active subscription, else the free plan.
- Effective config = the plan's own pivot row; otherwise **inherited from cheaper plans**
  (higher plans include everything lower plans grant). `getEffectiveFeatures()`,
  `getFeature()`, `hasFeature()`, `getFeatureValue()`, `hasUnlimitedFeature()`.
- `currentUsage(User, key)` — computed from domain data (active match requests as host or
  opponent; owned stadiums; non-archived tournaments).
- `canCreateResource()` / `authorizeResource()` / `authorizeFeature()` — throw
  `PlanLimitReachedException` (limit exhausted) or `PlanFeatureRequiredException` (not granted),
  both rendering 403 with `{ error, message, current_usage, limit, unlimited, required_plan }`.
- `plans()` is cached per request with features + discount eager loaded (no N+1).

## 4. Subscriptions
- `subscriptions` table: `user_id`, `plan_id`, `status` (`active|pending|expired|cancelled`),
  `starts_at`, `ends_at`, `cancelled_at`, **`price_at_start`**, `currency`, `billing_interval`.
- `price_at_start` is the plan price **snapshotted at creation** — a later admin price change
  never rewrites existing subscriptions (historical correctness).
- `SubscriptionService::subscribe(User, Plan)` is the single creation path: snapshots
  price/currency/interval, expires any previous active subscription, returns the new one.
  A future payment provider (Part 7) calls this after a successful checkout.
- `User::activeSubscription()` = latest `active` subscription (HasOne + latestOfMany);
  `User::currentPlan()` = its plan, else `Plan::free()`.

## 5. Admin
- CRUD under `backend/app/Http/Controllers/Admin/PlanController.php` + Form Requests in
  `backend/app/Http/Requests/Admin/`.
- Endpoints (all require `auth:sanctum` + approved + `admin` middleware → 403 otherwise):
  - `GET/POST /api/admin/plans`, `GET/PUT /api/admin/plans/{plan}`
  - `PATCH /api/admin/plans/{plan}/status`, `PUT /api/admin/plans/{plan}/features`
  - `PUT /api/admin/plans/{plan}/discount`, `POST /api/admin/plans/reorder`
  - `DELETE /api/admin/plans/{plan}` (409 when subscriptions exist)
- Changes take effect immediately: enforcement reads the DB on every request.
- Discount validation: percentage ≤ 100, fixed ≤ plan price, `ends_at ≥ starts_at`.

## 6. Pricing (public)
- `GET /api/v1/plans` (no auth) → active plans with own features, active discount and
  backend-computed `final_price`. Discount eligibility is **authoritative on the backend**
  (`PlanResource`), never recomputed in the frontend.
- `GET /api/me/subscription` (auth) → current subscription (incl. `price_at_start`), effective
  plan features, and live usage per limit feature.
- Frontend: `src/pages/pricing/` + `src/components/pricing/`.

## 7. Admin plans screen (this app)
- `src/pages/admin/plans/` — `index.jsx` (grid + modal CRUD), `planCard.jsx` (tier badge,
  status, discount chip, subscribers, reorder, delete), `planForm.jsx`, `pricingEditor.jsx`
  (price/currency/interval/free), `discountEditor.jsx` (type/value/window), `featureEditor.jsx`
  (toggle/limit/unlimited). Route `/admin/plans`, nav item `nav.admin.plans` in
  `src/pages/admin/index.jsx`.
- i18n keys: `admin.plans.*` in `src/locales/{ar,en}.json`.

## 8. Enforcement hooks (backend)
Match request create/accept, match feed challenge, terrain create, tournament create,
advanced statistics, landing visibility — all call `SubscriptionService` authorization.
Client-supplied `plan_id` is never trusted.
