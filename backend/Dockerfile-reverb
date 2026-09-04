# Reverb WebSocket server image (used by the Railway `reverb` service only).
# Nixpacks does not reliably auto-detect `php artisan reverb:start`, so this
# explicit Dockerfile makes the Reverb deploy reproducible. The other services
# (web, queue worker) keep using Nixpacks + their own start commands.

FROM php:8.2-cli AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        libxml2-dev libonig-dev libcurl4-openssl-dev libsodium-dev libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pcntl sockets bcmath zip pdo pdo_mysql \
        gd mbstring xml sodium intl exif curl opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies first for better layer caching (requires composer.json/lock present).
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --optimize-autoloader --no-scripts

# Application source.
COPY . .

RUN chmod +x start.sh
RUN php artisan package:discover --ansi || true

# Reverb listens on this port (default 8080). Railway exposes a public port.
ARG REVERB_SERVER_PORT=8080
ENV REVERB_SERVER_PORT=${REVERB_SERVER_PORT}
EXPOSE ${REVERB_SERVER_PORT}

CMD ["sh", "start.sh"]
