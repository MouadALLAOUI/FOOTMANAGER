# Production Deployment Guide — Push Notifications

This guide covers everything required to take the **Expo Push Notification** feature
(Phase 6.1 — Device Domain) live, plus the essential production setup it depends on.

Applies to:

- Backend: `backend/` (Laravel 12, `QUEUE_CONNECTION=database`)
- Mobile: `FOOT_MOBILE/` (Expo SDK 57, `expo-notifications`)
- Push flow: mobile registers device token → Laravel queues a job → `SendPushNotificationJob`
  posts to `https://exp.host/--/api/v2/push/send` → Expo delivers via FCM/APNs.

---

## 1. Backend — Production Checklist

### 1.1 Environment variables

Start from `backend/config/production.env.example`, copy it to the production server and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_ENV` | ✅ | `production` |
| `APP_DEBUG` | ✅ | `false` |
| `APP_KEY` | ✅ | Run `php artisan key:generate --force` once |
| `APP_URL` | ✅ | Full HTTPS URL (e.g. `https://api.footmanager.com`) |
| `DB_*` | ✅ | Production DB credentials |
| `QUEUE_CONNECTION` | ✅ | `database` (already set) |
| `EXPO_PUSH_HOST` | ✅ | Default `https://exp.host/--/api/v2/push/send` |
| `EXPO_ACCESS_TOKEN` | ✅ | Your EAS project access token (see §1.3) |
| `SANCTUM_STATEFUL_DOMAINS` | ✅ | Comma-separated frontend domains for cookie auth |
| `TRUSTED_PROXY` | ⚠️ | `*` (or LB IPs) so rate limiting + HTTPS work behind a load balancer |
| `MAIL_MAILER` | ⚠️ | `smtp` for real email (password-reset etc.) |
| `AWS_*` | ⚠️ | Only if using S3 as filesystem disk |

> `.env` files must never be committed. Both `backend/.env` (dev) and the production copy
> already contain the `EXPO_*` stubs — just fill the value.

### 1.2 Deploy steps (in order)

```bash
cd backend

# 1. Install dependencies (no dev packages, optimized autoloader)
composer install --no-dev --optimize-autoloader

# 2. Build the devices table (created in this feature)
php artisan migrate --force

# 3. Storage symlink (public uploads: avatars, logos, …)
php artisan storage:link

# 4. Warm caches (re-run after every deploy)
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 5. Restart the queue worker after deploy (picks up new code)
php artisan queue:restart
```

### 1.3 Set the Expo access token

- CLI: `eas token:create` (in the owning Expo account), or
- Dashboard: expo.dev → project → **Settings → Credentials → Access tokens → Create**.

Then on the server:

```bash
# backend/.env (production)
EXPO_ACCESS_TOKEN=your_token_here
```

Do NOT use anonymous sends in production — Expo rate-limits them and expects an access token.

### 1.4 Run the queue worker (required)

Push jobs only deliver when the worker is running. Without it, `jobs` table rows sit forever.

Supervisor config (`/etc/supervisor/conf.d/footmanager-queue.conf`):

```ini
[program:footmanager-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/footmanager/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600 --max-jobs=1000
directory=/var/www/footmanager/backend
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/footmanager/backend/storage/logs/queue-worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl status footmanager-queue
```

For Docker: run `php artisan queue:work` as a separate service; scale it with sessions, never run more
than one worker per DB queue unless you accept duplicate jobs.

### 1.5 Monitoring & ops

- **Logs** — successful deliveries log `Push notification delivered`; failures log
  `Push notification send failed` / `Push notification rejected by provider`.
  Search: `storage/logs/laravel.log`.
- **Failed jobs** — check `failed_jobs` table (migration `0003` already created it).
  Retry: `php artisan queue:retry all`.
- **Stale devices** — the job auto-deletes a device row when Expo returns
  `DeviceNotRegistered` (uninstall / revoked permission). No manual cleanup needed.
- **Scheduled tasks** — if other scheduled work exists, add one cron entry:

  ```
  * * * * * cd /var/www/footmanager/backend && php artisan schedule:run >> /dev/null 2>&1
  ```

### 1.6 End-to-end smoke test (backend)

```bash
# 1. Check worker is running
php artisan queue:monitor default

# 2. Send a test push to a real token (optional, use a registered device row)
php artisan tinker
```

```php
// inside tinker — simulate a notification dispatch
app(\App\Domains\Device\Services\PushNotificationService::class)
    ->sendToUser(1, 'اختبار', 'إشعار تجريبي', ['type' => 'system', 'category' => 'system']);

// or simulate a real flow
\App\Domains\Notification\Services\NotificationService::push(
    1, 'match_invitation', 'دعوة مباراة', 'فريق آخر دعاك لمباراة',
);
```

Verify: a `devices` row exists for that user, a job appears in `jobs`, and the phone receives it.

---

## 2. Mobile — Production Checklist

### 2.1 Create `eas.json` in `FOOT_MOBILE/`

Template:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./credentials/google-service-account.json" },
      "ios": { "appleId": "you@apple.com" }
    }
  }
}
```

### 2.2 Link the project / set the project ID

```bash
cd FOOT_MOBILE
eas init
```

`eas init` writes `expo.extra.eas.projectId` into `app.json`. This project ID is:

- required by `getExpoPushTokenAsync` in standalone builds, and
- used to scope push token + credentials on the Expo side.

Our service already resolves it:
`Constants.easConfig?.projectId ?? expoConfig.extra.eas.projectId` (`src/services/notifications/push-notifications.ts`).

### 2.3 Verify app config

`app.json` must contain (already added):

- `"expo-notifications"` inside `plugins` ✅ (compiles the native module, iOS `aps-environment`
  entitlement, Android channel support into the binary)
- `scheme: "footmanager"` ✅ (deep links used by notification tap navigation)

### 2.4 Credentials (one-time)

```bash
cd FOOT_MOBILE
eas credentials
```

- **Android**: generate/upload a keystore (`.jks`) or let EAS manage it. Expo uses the
  Expo push service on Android — no raw FCM setup required.
- **iOS**: upload an **Apple Push Notification (APNs) key** (`.p8`) in EAS, and make sure the
  app has the **Push Notifications** capability and `aps-environment` entitlement
  (the `expo-notifications` plugin adds it automatically).

### 2.5 Build & release

```bash
# Development client (for local testing with push on a real device)
eas build --platform android --profile development
eas build --platform ios --profile development

# Store/release build
eas build --platform all --profile production

# Submit to stores
eas submit --platform all --profile production
```

> **Expo Go cannot test push reliably in production builds** — always test on a
> development client or a release build on a physical device.
> Android 13+ also asks for the `POST_NOTIFICATIONS` runtime permission —
> our code requests it via `Notifications.requestPermissionsAsync()` on first login.

### 2.6 Send a manual push for testing

```bash
eas push:send --token "ExponentPushToken[xxxx]"
```

or from the Expo dashboard: **Push Notifications tool**. Enter the token (visible
in the backend: `SELECT * FROM devices;`) and verify the phone vibrates/show a banner.

---

## 3. Runtime flow — how to verify the whole chain works

1. User logs in → `AuthProvider` calls `registerCurrentDevice()` → row inserted in `devices`.
2. A business action fires (invite accepted, score disputed, booking approved, chat message) →
   `NotificationService::push()` dispatches a `SendPushNotificationJob` (or chat does it directly).
3. Worker POSTs to Expo → Expo delivers.
4. User taps notification → `PushNotificationsBootstrap` resolves it via
   `notificationTarget()` and navigates (also on cold start).

### Quick DB verification

```sql
-- user has a registered device
SELECT id, user_id, left(token, 20) AS token, platform, last_used_at FROM devices;

-- jobs are being processed (should be ~empty if worker keeps up)
SELECT COUNT(*) FROM jobs;
SELECT * FROM failed_jobs ORDER BY id DESC LIMIT 5;
```

---

## 4. Common production gotchas

| Issue | Symptom | Fix |
| --- | --- | --- |
| Push never arrives but job ran | Expo returns `DeviceNotRegistered` | Token stale → auto-deleted; have user re-login to re-register |
| Jobs pile up in `jobs` | Worker not running / crashed | Check Supervisor; `php artisan queue:restart` |
| Jobs fail with 429 | Expo rate limit / no access token | Set `EXPO_ACCESS_TOKEN`; check `services.expo` config |
| No banner on Android 13+ | Missing runtime permission | Re-login / re-prompt: `requestPermissionsAsync()` |
| Push token empty in build | `projectId` missing | Run `eas init`, verify `extra.eas.projectId` in `app.json` |
| 403s / rate limit thinks you're a bot | `TRUSTED_PROXY` unset behind LB | Set `TRUSTED_PROXY=*` (or LB IPs) |
| Called `php artisan config:cache` w/o `.env` | Env missing vars after deploy | Re-generate `.env`, re-run `config:cache` |