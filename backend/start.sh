#!/bin/sh
set -e

# 1. Ensure storage directories exist
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs

# 2. Create storage symlink
php artisan storage:link --force 2>/dev/null || true

# 3. Run pending migrations
php artisan migrate --force --no-interaction

# 4. Start queue worker in background
php artisan queue:work --tries=3 --timeout=90 --sleep=3 &

# 5. Start Reverb WebSocket server in background
php artisan reverb:start --host=0.0.0.0 --port=${REVERB_SERVER_PORT:-8080} &

# 6. Start web server (foreground — keeps the container alive)
php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
