#!/bin/sh
set -e

# 1. Ensure storage directories exist
mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs

# 2. Create storage symlink
php artisan storage:link --force 2>/dev/null || true

# 3. Execute the service command passed to docker/sh
exec "$@"