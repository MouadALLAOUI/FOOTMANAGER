#!/bin/sh
set -e

# 1. Ensure storage directories exist
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs

# 2. Create storage symlink
php artisan storage:link --force 2>/dev/null || true

# 3. Auto-run database migrations safely on every deployment
php artisan migrate --force 2>/dev/null || true

# 3.1. Synchronize all team statistics across tournaments and matches
php artisan teams:sync-stats 2>/dev/null || true

# 4. Cache configuration
php artisan config:cache

# 5. Start HTTP server in FOREGROUND (keeps container alive)
php artisan serve --host=0.0.0.0 --port=$PORT
