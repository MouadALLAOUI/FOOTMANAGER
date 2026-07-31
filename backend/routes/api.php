<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\FacilityController;
use App\Http\Controllers\Admin\ManagerApprovalController;
use App\Http\Controllers\Manager\MatchFeedController;
use App\Http\Controllers\Manager\MatchRequestController;
use App\Http\Controllers\Manager\MatchResultController;
use App\Http\Controllers\Manager\PlayerController;
use App\Http\Controllers\Manager\PublicTeamController;
use App\Http\Controllers\Manager\TeamProfileController;
use App\Http\Controllers\Public\LeaderboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StadiumController;
use App\Http\Controllers\Terrain\DirectBookingController;
use App\Http\Controllers\Terrain\BookingController;
use App\Http\Controllers\Terrain\OwnerBookingController;
use App\Http\Controllers\Terrain\OwnerTerrainController;
use App\Http\Controllers\Terrain\SlotClosureController;
use App\Http\Controllers\Terrain\TerrainOwnerController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/register-terrain-owner', [AuthController::class, 'registerTerrainOwner'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::get('/health', fn () => response()->json(['status' => 'ok', 'timestamp' => now()]));

Route::get('/stadiums', [StadiumController::class, 'index']);
Route::get('/terrains/public', [StadiumController::class, 'publicTerrains']);

Route::get('/leaderboard', [LeaderboardController::class, 'index']);

Route::get('/terrains/{terrainId}/slots', [BookingController::class, 'getTerrainSlots']);

Route::get('/facilities', [FacilityController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{id}/pin', [NotificationController::class, 'togglePin']);
    Route::put('/notifications/{id}/important', [NotificationController::class, 'toggleImportant']);

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/managers', [ManagerApprovalController::class, 'index']);
        Route::get('/managers/{id}', [ManagerApprovalController::class, 'show']);
        Route::put('/managers/{id}/approve', [ManagerApprovalController::class, 'approve']);
        Route::put('/managers/{id}/reject', [ManagerApprovalController::class, 'reject']);
        Route::put('/managers/{id}/block', [ManagerApprovalController::class, 'block']);
        Route::put('/managers/{id}/unblock', [ManagerApprovalController::class, 'unblock']);
        Route::get('/stats', [ManagerApprovalController::class, 'stats']);

        Route::get('/terrain-owners', [ManagerApprovalController::class, 'terrainOwners']);
        Route::get('/terrain-owners/{id}', [ManagerApprovalController::class, 'showTerrainOwner']);
        Route::put('/terrain-owners/{id}/approve', [ManagerApprovalController::class, 'approveTerrainOwner']);
        Route::put('/terrain-owners/{id}/reject', [ManagerApprovalController::class, 'rejectTerrainOwner']);
        Route::put('/terrain-owners/{id}/block', [ManagerApprovalController::class, 'blockTerrainOwner']);
        Route::put('/terrain-owners/{id}/unblock', [ManagerApprovalController::class, 'unblockTerrainOwner']);

        Route::apiResource('facilities', FacilityController::class)->except('show');
    });

    Route::middleware('manager.approved')->group(function () {
        Route::get('/manager/my-match-requests', [MatchRequestController::class, 'index']);
        Route::get('/manager/received-challenges', [MatchRequestController::class, 'receivedChallenges']);
        Route::post('/manager/match-requests', [MatchRequestController::class, 'store']);
        Route::post('/manager/challenges', [MatchRequestController::class, 'sendChallenge']);
        Route::put('/manager/challenges/{id}/respond', [MatchRequestController::class, 'respondToChallenge']);
        Route::delete('/manager/match-requests/{id}', [MatchRequestController::class, 'destroy']);

        Route::get('/manager/match-feed', [MatchFeedController::class, 'index']);
        Route::post('/manager/match-requests/{id}/accept', [MatchFeedController::class, 'accept']);

        Route::get('/manager/team-profile', [TeamProfileController::class, 'show']);
        Route::put('/manager/team-profile', [TeamProfileController::class, 'update']);
        Route::post('/manager/team-profile/logo', [TeamProfileController::class, 'uploadLogo']);

        Route::get('/manager/teams/{id}', [PublicTeamController::class, 'show']);

        Route::get('/manager/matches/pending-scores', [MatchResultController::class, 'pendingScores']);
        Route::get('/manager/matches/pending-confirmations', [MatchResultController::class, 'pendingConfirmations']);
        Route::post('/manager/matches/{id}/submit-score', [MatchResultController::class, 'submitScore']);
        Route::post('/manager/matches/{id}/confirm-score', [MatchResultController::class, 'confirmScore']);
        Route::post('/manager/matches/{id}/dispute-score', [MatchResultController::class, 'disputeScore']);

        Route::get('/manager/players', [PlayerController::class, 'index']);
        Route::post('/manager/players', [PlayerController::class, 'store']);
        Route::put('/manager/players/{id}', [PlayerController::class, 'update']);
        Route::delete('/manager/players/{id}', [PlayerController::class, 'destroy']);

        Route::get('/manager/bookings', [BookingController::class, 'getManagerBookings']);
        Route::get('/manager/terrains/{terrainId}/my-reservations', [BookingController::class, 'myReservations']);
        Route::post('/manager/bookings/{bookingId}/request-cancel', [BookingController::class, 'requestCancel']);
        Route::post('/manager/match-requests/from-booking/{bookingId}', [MatchRequestController::class, 'createFromBooking']);
        Route::post('/manager/bookings/training', [BookingController::class, 'createTrainingBooking']);
        Route::post('/manager/direct-bookings', [DirectBookingController::class, 'store']);
    });

    Route::middleware('terrain.owner')->prefix('owner')->group(function () {
        Route::get('/terrains', [TerrainOwnerController::class, 'index']);
        Route::get('/terrains/{id}', [TerrainOwnerController::class, 'show']);
        Route::post('/terrains', [TerrainOwnerController::class, 'store']);
        Route::put('/terrains/{id}', [TerrainOwnerController::class, 'update']);
        Route::delete('/terrains/{id}', [TerrainOwnerController::class, 'destroy']);
        Route::post('/terrains/{id}/images', [TerrainOwnerController::class, 'uploadImages']);
        Route::delete('/terrains/{terrainId}/images/{imageId}', [TerrainOwnerController::class, 'destroyImage']);
        Route::get('/stats', [TerrainOwnerController::class, 'stats']);
        Route::get('/bookings', [TerrainOwnerController::class, 'upcomingBookings']);

        Route::put('/terrains/{id}/toggle-status', [OwnerTerrainController::class, 'toggleStatus']);
        Route::put('/terrains/{id}/working-hours', [OwnerTerrainController::class, 'updateWorkingHours']);

        Route::get('/terrains/{terrainId}/calendar', [BookingController::class, 'getOwnerCalendar']);
        Route::put('/bookings/{bookingId}/status', [BookingController::class, 'ownerManageBooking']);

        Route::put('/bookings/{id}/approve', [OwnerBookingController::class, 'approve']);
        Route::put('/bookings/{id}/reject', [OwnerBookingController::class, 'reject']);
        Route::get('/cancellation-requests', [OwnerBookingController::class, 'cancellationRequests']);
        Route::put('/cancellation-requests/{cancellationId}', [OwnerBookingController::class, 'handleCancellation']);

        Route::get('/terrains/{terrainId}/slot-closures', [SlotClosureController::class, 'index']);
        Route::post('/terrains/{terrainId}/slot-closures', [SlotClosureController::class, 'store']);
        Route::delete('/terrains/{terrainId}/slot-closures/{closureId}', [SlotClosureController::class, 'destroy']);
    });
});
