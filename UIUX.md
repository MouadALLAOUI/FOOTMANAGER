# FootMANAGER — UI/UX Audit & Improvement Plan (v2)

> **Last Audited:** 2026-07-31 (Second pass after v1 fixes)
> **Status Legend:** ✅ Fixed | ⚠️ Partial | ❌ Still Needed | 🆕 Newly Found

---

## ✅ What Was Fixed Since v1

| Issue | Status |
|---|---|
| Sidebar direction bug (`end-0` → `start-0`, `me-*` → `ms-*`) | ✅ All three layouts fixed |
| Missing language switcher in dashboards | ✅ Added to `DashboardHeader` (Globe button, AR↔EN toggle) |
| Hardcoded Leaderboard table headers (Arabic abbreviations) | ✅ Now using `t('leaderboard.*')` keys |
| Hardcoded Dashboard section titles & button labels | ✅ Now using `t('dashboard.*')` keys |
| Status badge labels (Pending/Accepted/Completed etc.) | ✅ Now using `labelKey` pattern |
| `premium-glass` glassmorphism utility introduced | ✅ Applied to stat cards and match feed cards |
| Registration step progress indicator added | ✅ Multi-step progress bar in `Register.jsx` |
| PodiumLeaderboard component added | ✅ Top-3 podium rendered before the main table |

---

## ❌ Remaining Critical Issues

### 1. Hardcoded `GF:` / `GA:` / `GD:` Labels in Dashboard Stat Card
**File:** [Dashboard.jsx L284–L286](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Manager/Dashboard.jsx#L284-L286)

```jsx
// ❌ Hardcoded — still raw strings, not i18n keys
<span>GF: {teamStats?.goals_for || 0}</span>
<span>GA: {teamStats?.goals_against || 0}</span>
<span>GD: {teamStats?.goal_difference ?? 0}</span>
```

**Fix:** Use `t('leaderboard.forShort')`, `t('leaderboard.againstShort')`, `t('leaderboard.diffShort')` (these keys exist in `en.json` and `ar.json`).

---

### 2. Date Locale Hardcoded to `en-CA` Everywhere
**Affected Files (24+ instances):** `Dashboard.jsx`, `MatchFeed.jsx`, `Reservations.jsx`, `ReportScoreModal.jsx`, `AcceptMatchModal.jsx`, `ConfirmScoreModal.jsx`, `TerrainOwner/Dashboard.jsx`, `ManagerApprovals.jsx`, etc.

```jsx
// ❌ Always English date format regardless of language
new Date(m.match_datetime).toLocaleDateString('en-CA')
```

**Fix:** Replace `'en-CA'` with a dynamic locale from `i18n.language`:
```jsx
const { i18n } = useTranslation();
const locale = i18n.language === 'ar' ? 'ar-MA' : 'en-CA';
// Then use: new Date(dt).toLocaleDateString(locale)
```
This is a systemic issue affecting every page.

---

### 3. Dark Scrollbar in Light-Background Dashboards
**File:** [index.css L61–L88](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/index.css#L61-L88)

The custom scrollbar is styled for a dark UI (`background: #090d16`, `thumb: #1e293b`) but all dashboard pages have a **light gray** background (`bg-gray-50`). The dark scrollbar looks jarring and broken.

**Fix:** Either scope the dark scrollbar only to dark-themed elements (e.g., `[data-theme="dark"] ::-webkit-scrollbar`) or switch to a neutral light scrollbar for the dashboard:
```css
/* Light scrollbar for the dashboard body */
body ::-webkit-scrollbar-track { background: #f1f5f9; }
body ::-webkit-scrollbar-thumb { background: #cbd5e1; border: 2px solid #f1f5f9; }
body ::-webkit-scrollbar-thumb:hover { background: #16a34a; }
```

---

### 4. Login & Register Pages — Plain/Dated Aesthetic
**Files:** [Login.jsx](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Auth/Login.jsx), [Register.jsx](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Auth/Register.jsx)

Both pages use a plain `bg-gradient-to-bl from-green-50 to-white` with a flat white card. This is a sharp contrast to the dark, premium landing page.

**Current issues:**
- Plain white card with no depth, no glassmorphism.
- No animated background (landing page has floating shapes & grid).
- Input fields have no icon separation on the right side (icons are `start-3` only).
- Password field has no visibility toggle (👁 eye icon missing).
- No "Forgot password?" link on login.

**Fix suggestions:**
- Bring the dark gradient/glassmorphism style from the landing page to auth pages.
- Add a floating icon pattern or subtle field pitch graphic in the background.
- Add password visibility toggle button to all password fields.
- Add subtle `hover:shadow-lg` elevation on the card.

---

### 5. `PendingApproval.jsx` — Broken Icon Import
**File:** [PendingApproval.jsx L13](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Auth/PendingApproval.jsx#L13)

```jsx
// ❌ Clock is not imported — will throw ReferenceError at runtime
import { Clock, ArrowRight } from 'lucide-react'; // import IS correct
<Clock className="text-yellow-600" size={40} />    // but 'Clock' was missing in original
```

> **Verify:** Confirm `Clock` is in the import. If not, add it.

---

### 6. `DashboardHeader` — Duplicate Logout Button
**File:** [DashboardHeader.jsx L47–L54](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/components/Navigation/DashboardHeader.jsx#L47-L54)

The header renders a **logout button** in the top-right corner. The sidebar *also* renders a logout button at the bottom. This is redundant and wastes header real estate that could be used for the user's name/avatar.

**Fix:** Remove the logout button from the header. Replace it with a user avatar + name pill that opens a dropdown with "Logout" and "Settings" options.

---

### 7. Dashboard Header Title Always Shows "Dashboard" in All Roles
**File:** [ManagerLayout.jsx L92](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/layouts/ManagerLayout.jsx#L92)

```jsx
<DashboardHeader title={t('nav.dashboard')} onMenuClick={...} />
```

The title is static — it never reflects the currently active page (e.g., "Leaderboard", "My Requests", "Browse Matches").

**Fix:** Read the `title` prop dynamically from the current route. A good approach is to use a `useLocation()` hook to look up a `title` from the `navItems` map:
```jsx
const currentRoute = navItems.find(item => location.pathname === item.to);
const pageTitle = currentRoute?.label || t('nav.dashboard');
// Pass as: <DashboardHeader title={pageTitle} />
```

---

## ⚠️ Aesthetic & UX Improvements (Partially Addressed)

### 8. Sidebar Collapse Toggles Wrong for RTL
**Files:** All layouts

The `PanelLeftClose` / `PanelLeftOpen` icons are semantically for LTR left-panel closing. In RTL, the sidebar is on the right — using a `PanelRightClose` / `PanelRightOpen` icon makes more directional sense.

**Fix:** Render the correct icon depending on direction:
```jsx
const { i18n } = useTranslation();
const isRTL = i18n.language === 'ar';
const CollapseIcon = collapsed
  ? (isRTL ? PanelRightOpen : PanelLeftOpen)
  : (isRTL ? PanelRightClose : PanelLeftClose);
```

---

### 9. Dashboard Stat Card — Missed Opportunity for Visual Impact
**File:** [Dashboard.jsx L246–L289](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Manager/Dashboard.jsx#L246-L289)

The three stat cards are functional but lack visual excitement. The "Team Stats" card shows points/wins/draws as plain text with a small `|` separator between GF and GD numbers.

**Suggested upgrades:**
- **Win Rate Ring:** Display a small SVG ring/donut chart showing the win percentage visually.
- **Streak Indicator:** Show a 5-match streak badge row (e.g., `W W L D W` with green/red/yellow dots).
- **Gradient accent bar:** Add a colored gradient bar at the top of each stat card to visually separate them.

---

### 10. Empty State Designs — Generic Icons
Several empty states use generic gray Lucide icons with plain text:
- `Reservations.jsx`: `<MapPin>` for "no reservations" — confusing icon choice.
- `MatchFeed.jsx`: Should show a football pitch graphic or animated football icon.
- `Dashboard.jsx` "My Requests" empty: Should show a trophy or whistle with a CTA.

**Fix:** Use more contextual icons and add a clear CTA button in each empty state.

---

### 11. Match Feed Cards — Too Information-Dense
**File:** [MatchFeed.jsx](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Manager/MatchFeed.jsx)

Match cards show a lot of data (team name, stadium, city, date, time, category, amenities, price) without clear visual hierarchy. On mobile, cards feel cluttered.

**Fix:**
- Add a clear bold "Host Team" section with a team avatar circle.
- Move secondary details (amenities list, price) into a collapsible accordion.
- Increase spacing between the primary info and action buttons.

---

### 12. No Loading Skeleton — Jarring Content Jump
When any dashboard page loads, it shows a centered `<Loader2>` spinner and then jumps immediately to content. There is no smooth skeleton transition.

**Fix:** Replace spinner with a skeleton placeholder (gray animated blocks) that matches the shape of the content below.

---

### 13. Admin Overview Cards — Missing `premium-glass` Treatment
**File:** [AdminOverview.jsx L62](file:///c:/Users/mouad/Desktop/FootMANAGER/frontend/src/pages/Admin/AdminOverview.jsx#L62)

```jsx
// Uses plain bg-white, not the premium-glass system
className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-start hover:shadow-md transition"
```

The Manager Dashboard uses `premium-glass premium-glass-hover` for its stat cards (which give the hover lift and border highlight), but the Admin Overview uses plain white cards. Visual inconsistency.

**Fix:** Apply `premium-glass premium-glass-hover` to Admin Overview cards.

---

### 14. Mobile Sidebar — No Animated Slide-In
**Files:** All layouts (`ManagerLayout`, `TerrainOwnerLayout`, `AdminLayout`)

The mobile sidebar uses CSS `translate: -100%` / `translate: 100%` via the `.sidebar-hidden` class but there is **no transition** on this class, causing the sidebar to teleport in/out with no animation.

```css
/* Current — no transition! */
.sidebar-hidden { translate: -100% 0; }
```

**Fix:** Add a CSS transition:
```css
aside {
  transition: translate 0.3s ease;
}
```

---

## 🚀 Creative / Premium Upgrades (Not Yet Implemented)

### 15. Leaderboard Podium — Team Color Theming
The new `PodiumLeaderboard` component exists but likely uses fixed green colors for all teams. Teams define `primary_color` and `secondary_color` in their profile — use them on the podium cards for personalization.

### 16. Page-Level Entry Animations
No page has an entry animation. Adding a subtle `opacity-0 → opacity-100` + `translateY(8px) → 0` animation for each page on load would make navigation feel polished.

```css
@keyframes page-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: page-in 0.25s ease-out; }
```

### 17. Football Pitch Favicon & Better App Icon
The browser tab likely shows the default Vite favicon. Replacing it with a football/trophy SVG favicon reinforces brand identity.

### 18. Landing Page Snap Scroll — Disable on Mobile
The landing page uses `snap-y snap-mandatory h-screen overflow-y-scroll`. On mobile devices and trackpads this causes frustrating scroll hijacking.

**Fix:** Apply snap scrolling only on `lg:` screens:
```jsx
<main className="h-screen overflow-y-scroll snap-y snap-mandatory lg:snap-y lg:snap-mandatory">
```
Or use a media-query conditional in CSS.

---

## 📋 Priority-Ordered Fix Queue

| # | Issue | Severity | Effort |
|---|---|---|---|
| 2 | Date locale hardcoded to `en-CA` | 🔴 High | Medium |
| 3 | Dark scrollbar on light dashboard | 🔴 High | Low |
| 1 | GF/GA/GD hardcoded labels | 🟠 Medium | Low |
| 7 | Header title always "Dashboard" | 🟠 Medium | Low |
| 6 | Duplicate logout button | 🟠 Medium | Low |
| 14 | Mobile sidebar no slide animation | 🟠 Medium | Low |
| 4 | Auth pages plain aesthetic | 🟡 Low | High |
| 5 | PendingApproval import check | 🟡 Low | Low |
| 8 | Sidebar collapse RTL icons | 🟡 Low | Low |
| 9 | Stat card visual upgrades | 🟡 Low | Medium |
| 13 | Admin cards use premium-glass | 🟡 Low | Low |
| 12 | Loading skeleton states | 🟡 Low | Medium |
| 16 | Page entry animations | 🟢 Nice-to-have | Low |
| 15 | Podium team color theming | 🟢 Nice-to-have | Low |
| 17 | Football favicon | 🟢 Nice-to-have | Low |
| 18 | Disable snap scroll on mobile | 🟢 Nice-to-have | Low |
