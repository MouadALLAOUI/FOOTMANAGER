#!/bin/sh
set -e

# 1. Ensure storage directories exist
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs

# 2. Create storage symlink
php artisan storage:link --force 2>/dev/null || true

# 3. Cache configuration
php artisan config:cache

# 4. Start HTTP server in FOREGROUND (keeps container alive)
php artisan serve --host=0.0.0.0 --port=$PORT
