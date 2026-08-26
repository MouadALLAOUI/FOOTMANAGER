<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('subscriptions:cancel-expired')->daily();
Schedule::command('bookings:expire-pending')->dailyAt('03:00');
Schedule::command('team:process-scheduled-announcements')->everyMinute();
Schedule::command('sanctum:prune-expired --hours=24')->daily();
