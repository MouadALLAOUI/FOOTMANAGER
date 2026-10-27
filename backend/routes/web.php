<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\Public\PublicLiveMatchPageController;
use App\Http\Controllers\Public\PublicLiveMatchDataController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HealthController::class, '__invoke']);

// Public live match viewing & data polling routes
Route::get('/live/{token}', [PublicLiveMatchPageController::class, 'show'])->name('public.live.match');
Route::get('/live/{token}/data', [PublicLiveMatchDataController::class, 'data'])->middleware('throttle:120,1')->name('public.live.match.data');
