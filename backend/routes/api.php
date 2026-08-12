<?php

use App\Domains\Booking\Controllers\BookingController as V1BookingController;
use App\Domains\Chat\Controllers\MatchChatController;
use App\Domains\Competition\Controllers\CompetitionController;
use App\Domains\Leaderboard\Controllers\LeaderboardController as PublicLeaderboardController;
use App\Domains\Leaderboard\Controllers\StatsController;
use App\Domains\Match\Controllers\LiveMatchController;
use App\Domains\Match\Controllers\MatchController;
use App\Domains\Notification\Controllers\NotificationController;
use App\Domains\Player\Controllers\AchievementController;
use App\Domains\Player\Controllers\AvailabilityController;
use App\Domains\Player\Controllers\CareerController;
use App\Domains\Player\Controllers\DashboardController as PlayerDashboardController;
use App\Domains\Player\Controllers\EventsController;
use App\Domains\Player\Controllers\GalleryController;
use App\Domains\Player\Controllers\LeaderboardController as V1PlayerLeaderboardController;
use App\Domains\Player\Controllers\PerformanceController;
use App\Domains\Player\Controllers\ProfileController;
use App\Domains\Player\Controllers\ResourcesController;
use App\Domains\Player\Controllers\SecurityController;
use App\Domains\Player\Controllers\SettingsController as V1PlayerSettingsController;
use App\Domains\Player\Controllers\StatisticsController;
use App\Domains\Review\Controllers\PlayerReviewController;
use App\Domains\Review\Controllers\StadiumReviewController;
use App\Domains\Shared\Controllers\CityController;
use App\Domains\Shared\Controllers\HomeController;
use App\Domains\Social\Controllers\CommentController;
use App\Domains\Social\Controllers\FavoriteController;
use App\Domains\Social\Controllers\FeedController;
use App\Domains\Social\Controllers\FollowController;
use App\Domains\Social\Controllers\ModerationController;
use App\Domains\Social\Controllers\ReactionController;
use App\Domains\Social\Controllers\SearchController;
use App\Domains\Stadium\Controllers\StadiumController as PublicStadiumController;
use App\Domains\Team\Controllers\AttendanceController as V1AttendanceController;
use App\Domains\Team\Controllers\CaptainController;
use App\Domains\Team\Controllers\PlayerController as V1PlayerController;
use App\Domains\Team\Controllers\TeamAnnouncementController;
use App\Domains\Team\Controllers\TeamController as V1TeamController;
use App\Domains\Team\Controllers\TeamDashboardController;
use App\Domains\Team\Controllers\TeamFixtureController;
use App\Domains\Team\Controllers\TeamFormationController;
use App\Domains\Team\Controllers\TeamGalleryController;
use App\Domains\Team\Controllers\TeamPageController;
use App\Domains\Team\Controllers\TeamProfileController as V1TeamProfileController;
use App\Domains\Team\Controllers\TeamStatisticsController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\CommitteeApprovalController;
use App\Http\Controllers\Admin\FacilityController;
use App\Http\Controllers\Admin\ManagerApprovalController;
use App\Http\Controllers\Admin\PlayerApprovalController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Committee\CommitteeRefereeController;
use App\Http\Controllers\Committee\CommitteeTeamController;
use App\Http\Controllers\Committee\CommitteeTeamPlayerController;
use App\Http\Controllers\Committee\TournamentBracketController;
use App\Http\Controllers\Committee\TournamentController;
use App\Http\Controllers\Committee\TournamentDrawController;
use App\Http\Controllers\Committee\TournamentFixtureController;
use App\Http\Controllers\Committee\TournamentMatchEventController;
use App\Http\Controllers\Committee\TournamentResultController;
use App\Http\Controllers\Committee\TournamentStadiumController;
use App\Http\Controllers\Committee\TournamentStandingController;
use App\Http\Controllers\Committee\TournamentStatisticsController;
use App\Http\Controllers\Committee\TournamentTeamController;
use App\Http\Controllers\Manager\MatchFeedController;
use App\Http\Controllers\Manager\MatchRequestController;
use App\Http\Controllers\Manager\MatchResultController;
use App\Http\Controllers\Manager\PlayerController;
use App\Http\Controllers\Manager\PlayerRecruitController;
use App\Http\Controllers\Manager\PublicTeamController;
use App\Http\Controllers\Manager\TeamProfileController;
use App\Http\Controllers\Player\PlayerController as PlayerProfileController;
use App\Http\Controllers\Public\LeaderboardController;
use App\Http\Controllers\Public\PlayerLeaderboardController;
use App\Http\Controllers\Public\PublicTournamentController;
use App\Http\Controllers\StadiumController;
use App\Http\Controllers\Terrain\BookingController;
use App\Http\Controllers\Terrain\DirectBookingController;
use App\Http\Controllers\Terrain\OwnerBookingController;
use App\Http\Controllers\Terrain\OwnerTerrainController;
use App\Http\Controllers\Terrain\SlotClosureController;
use App\Http\Controllers\Terrain\TerrainOwnerController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/register-terrain-owner', [AuthController::class, 'registerTerrainOwner'])->middleware('throttle:5,1');
Route::post('/register-player', [AuthController::class, 'registerPlayer'])->middleware('throttle:5,1');
Route::post('/register-committee', [AuthController::class, 'registerCommittee'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::get('/health', fn() => response()->json(['status' => 'ok', 'timestamp' => now()]));

Route::prefix('v1')->group(function () {
    Route::get('/home', [HomeController::class, 'index']);
    Route::get('/stadiums', [PublicStadiumController::class, 'index']);
    Route::get('/stadiums/{stadium}', [PublicStadiumController::class, 'show']);
    Route::get('/matches', [MatchController::class, 'index']);
    Route::get('/live-matches', [MatchController::class, 'live']);
    Route::get('/leaderboard', [PublicLeaderboardController::class, 'index']);
    Route::get('/stats', [StatsController::class, 'index']);

    Route::get('/live', [LiveMatchController::class, 'index']);
    Route::get('/live/{match}', [LiveMatchController::class, 'show']);

    Route::get('/teams/{team}/page', [TeamPageController::class, 'show']);
    Route::get('/feed', [FeedController::class, 'index']);
    Route::get('/comments', [CommentController::class, 'index']);
    Route::get('/comments/{comment}/replies', [CommentController::class, 'replies']);
    Route::get('/players/{player}/reviews', [PlayerReviewController::class, 'index']);
    Route::get('/stadiums/{stadium}/reviews', [StadiumReviewController::class, 'index']);

    Route::get('/competitions', [CompetitionController::class, 'index']);
    Route::get('/competitions/{competition}', [CompetitionController::class, 'show']);
    Route::get('/competitions/{competition}/seasons', [CompetitionController::class, 'seasons']);
    Route::get('/competitions/{competition}/fixtures', [CompetitionController::class, 'fixtures']);
    Route::get('/competitions/{competition}/standings', [CompetitionController::class, 'standings']);

    Route::get('/tournaments', [PublicTournamentController::class, 'index']);
    Route::get('/tournaments/{tournament}', [PublicTournamentController::class, 'show']);
    Route::get('/tournaments/{tournament}/fixtures', [PublicTournamentController::class, 'fixtures']);
    Route::get('/tournaments/{tournament}/teams', [PublicTournamentController::class, 'teams']);
    Route::get('/tournaments/{tournament}/draw', [PublicTournamentController::class, 'draw']);
    Route::get('/tournaments/{tournament}/standings', [PublicTournamentController::class, 'standings']);
    Route::get('/tournaments/{tournament}/bracket', [PublicTournamentController::class, 'bracket']);
    Route::get('/tournaments/{tournament}/statistics', [PublicTournamentController::class, 'statistics']);

    Route::middleware(['auth:sanctum', 'user.approved'])->prefix('bookings')->group(function () {
        Route::post('/confirm', [V1BookingController::class, 'confirm']);
        Route::post('/{booking}/payment-intent', [V1BookingController::class, 'paymentIntent']);
        Route::get('/history', [V1BookingController::class, 'history']);
        Route::get('/upcoming', [V1BookingController::class, 'upcoming']);
        Route::get('/{booking}', [V1BookingController::class, 'show']);
        Route::post('/{booking}/cancel', [V1BookingController::class, 'cancel']);
        Route::get('/{booking}/receipt', [V1BookingController::class, 'receipt']);
    });

    Route::middleware(['auth:sanctum', 'manager.approved'])->prefix('manager/team')->group(function () {
        Route::get('/', [V1TeamProfileController::class, 'show']);
        Route::put('/', [V1TeamProfileController::class, 'update']);
        Route::post('/logo', [V1TeamProfileController::class, 'uploadLogo']);
        Route::post('/cover', [V1TeamProfileController::class, 'uploadCover']);

        Route::get('/gallery', [TeamGalleryController::class, 'index']);
        Route::post('/gallery', [TeamGalleryController::class, 'store']);
        Route::post('/gallery/reorder', [TeamGalleryController::class, 'reorder']);
        Route::put('/gallery/{image}/cover', [TeamGalleryController::class, 'setCover']);
        Route::delete('/gallery/{image}', [TeamGalleryController::class, 'destroy']);

        Route::get('/statistics', [TeamStatisticsController::class, 'index']);

        Route::get('/fixtures/upcoming', [TeamFixtureController::class, 'upcoming']);
        Route::get('/fixtures/history', [TeamFixtureController::class, 'history']);

        Route::post('/attendance', [V1AttendanceController::class, 'store']);
        Route::get('/attendance', [V1AttendanceController::class, 'index']);

        Route::get('/formation', [TeamFormationController::class, 'show']);
        Route::put('/formation', [TeamFormationController::class, 'update']);

        Route::put('/captain/{player}', [CaptainController::class, 'assignCaptain']);
        Route::put('/vice-captain/{player}', [CaptainController::class, 'assignViceCaptain']);
        Route::delete('/captain', [CaptainController::class, 'removeCaptain']);
        Route::delete('/vice-captain', [CaptainController::class, 'removeViceCaptain']);

        Route::get('/announcements', [TeamAnnouncementController::class, 'index']);
        Route::post('/announcements', [TeamAnnouncementController::class, 'store']);
        Route::get('/announcements/{announcement}', [TeamAnnouncementController::class, 'show']);
        Route::put('/announcements/{announcement}', [TeamAnnouncementController::class, 'update']);
        Route::delete('/announcements/{announcement}', [TeamAnnouncementController::class, 'destroy']);

        Route::get('/dashboard', [TeamDashboardController::class, 'index']);

        Route::get('/players', [V1PlayerController::class, 'index']);
        Route::post('/players', [V1PlayerController::class, 'store']);
        Route::get('/players/{player}', [V1PlayerController::class, 'show']);
        Route::put('/players/{player}', [V1PlayerController::class, 'update']);
        Route::delete('/players/{player}', [V1PlayerController::class, 'destroy']);
    });

    Route::middleware(['auth:sanctum', 'manager.approved'])->prefix('live')->group(function () {
        Route::post('/{match}/start', [LiveMatchController::class, 'start']);
        Route::post('/{match}/pause', [LiveMatchController::class, 'pause']);
        Route::post('/{match}/resume', [LiveMatchController::class, 'resume']);
        Route::put('/{match}/minute', [LiveMatchController::class, 'setMinute']);
        Route::post('/{match}/finish', [LiveMatchController::class, 'finish']);
        Route::post('/{match}/cancel', [LiveMatchController::class, 'cancel']);
        Route::post('/{match}/postpone', [LiveMatchController::class, 'postpone']);

        Route::post('/{match}/events', [LiveMatchController::class, 'storeEvent']);
        Route::put('/events/{event}', [LiveMatchController::class, 'updateEvent']);
        Route::delete('/events/{event}', [LiveMatchController::class, 'destroyEvent']);

        Route::put('/{match}/statistics', [LiveMatchController::class, 'updateStatistics']);
        Route::put('/{match}/lineup', [LiveMatchController::class, 'setLineup']);
        Route::put('/{match}/performance', [LiveMatchController::class, 'setPerformance']);
        Route::post('/{match}/mvp', [LiveMatchController::class, 'awardMvp']);
    });

    Route::middleware('auth:sanctum')->prefix('team')->group(function () {
        Route::get('/', [V1TeamController::class, 'profile']);
        Route::get('/gallery', [V1TeamController::class, 'gallery']);
        Route::get('/fixtures/upcoming', [V1TeamController::class, 'upcoming']);
        Route::get('/fixtures/history', [V1TeamController::class, 'history']);
        Route::get('/announcements', [V1TeamController::class, 'announcements']);
        Route::post('/announcements/{announcement}/read', [TeamAnnouncementController::class, 'markRead']);
    });

    Route::middleware('auth:sanctum')->prefix('player')->group(function () {
        Route::get('/leaderboard', [V1PlayerLeaderboardController::class, 'index']);
        Route::get('/profiles/{userId}', [ProfileController::class, 'showUser']);
        Route::get('/profiles/{userId}/gallery', [GalleryController::class, 'indexForUser']);
        Route::get('/profiles/{userId}/career', [CareerController::class, 'historyForUser']);
        Route::get('/profiles/{userId}/achievements', [AchievementController::class, 'forUser']);

        Route::middleware('player.approved')->group(function () {
            Route::get('/dashboard', [PlayerDashboardController::class, 'index']);

            Route::get('/profile', [ProfileController::class, 'show']);
            Route::put('/profile', [ProfileController::class, 'update']);
            Route::post('/profile/photo', [ProfileController::class, 'uploadPhoto']);
            Route::post('/profile/cover', [ProfileController::class, 'uploadCover']);
            Route::put('/profile/availability-status', [ProfileController::class, 'setAvailabilityStatus']);

            Route::get('/gallery', [GalleryController::class, 'index']);
            Route::post('/gallery', [GalleryController::class, 'store']);
            Route::post('/gallery/reorder', [GalleryController::class, 'reorder']);
            Route::put('/gallery/{image}/cover', [GalleryController::class, 'setCover']);
            Route::put('/gallery/{image}', [GalleryController::class, 'update']);
            Route::delete('/gallery/{image}', [GalleryController::class, 'destroy']);

            Route::get('/statistics', [StatisticsController::class, 'index']);
            Route::post('/statistics/sync', [StatisticsController::class, 'sync']);
            Route::get('/statistics/ratings', [StatisticsController::class, 'ratings']);

            Route::get('/career', [CareerController::class, 'history']);
            Route::get('/career/transfers', [CareerController::class, 'transfers']);

            Route::get('/availability', [AvailabilityController::class, 'index']);
            Route::post('/availability', [AvailabilityController::class, 'store']);
            Route::put('/availability/{slot}', [AvailabilityController::class, 'update']);
            Route::delete('/availability/{slot}', [AvailabilityController::class, 'destroy']);

            Route::get('/achievements', [AchievementController::class, 'index']);
            Route::get('/achievements/unlocked', [AchievementController::class, 'unlocked']);

            Route::get('/performance', [PerformanceController::class, 'recent']);
            Route::get('/performance/heatmap', [PerformanceController::class, 'heatmap']);
            Route::get('/performance/positions', [PerformanceController::class, 'positionBreakdown']);
            Route::get('/performance/best', [PerformanceController::class, 'best']);
            Route::get('/performance/form', [PerformanceController::class, 'form']);

            Route::get('/settings', [V1PlayerSettingsController::class, 'show']);
            Route::put('/settings', [V1PlayerSettingsController::class, 'update']);

            Route::get('/resources', [ResourcesController::class, 'index']);
            Route::get('/events', [EventsController::class, 'index']);

            Route::post('/security/password', [SecurityController::class, 'updatePassword']);
            Route::get('/security/sessions', [SecurityController::class, 'sessions']);
            Route::delete('/security/sessions/{tokenId}', [SecurityController::class, 'revokeSession']);
            Route::post('/security/sessions/revoke-others', [SecurityController::class, 'revokeOtherSessions']);
        });
    });

    Route::middleware(['auth:sanctum', 'user.approved'])->prefix('social')->group(function () {
        Route::get('/search', [SearchController::class, 'search']);
        Route::get('/search/suggest', [SearchController::class, 'suggest']);
        Route::get('/search/recent', [SearchController::class, 'recent']);
        Route::get('/search/popular', [SearchController::class, 'popular']);

        Route::post('/comments', [CommentController::class, 'store']);
        Route::post('/comments/{comment}/reply', [CommentController::class, 'reply']);
        Route::put('/comments/{comment}', [CommentController::class, 'update']);
        Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
        Route::post('/comments/{comment}/like', [CommentController::class, 'like']);
        Route::post('/comments/{comment}/pin', [CommentController::class, 'pin']);
        Route::post('/comments/{comment}/report', [CommentController::class, 'report']);

        Route::post('/reactions', [ReactionController::class, 'store']);
        Route::delete('/reactions', [ReactionController::class, 'destroy']);
        Route::get('/reactions', [ReactionController::class, 'show']);

        Route::post('/follow', [FollowController::class, 'store']);
        Route::delete('/follow/{targetType}/{targetId}', [FollowController::class, 'destroy']);
        Route::get('/followers', [FollowController::class, 'followers']);
        Route::get('/following', [FollowController::class, 'following']);
        Route::get('/follow/status', [FollowController::class, 'status']);

        Route::post('/favorites', [FavoriteController::class, 'store']);
        Route::delete('/favorites/{targetType}/{targetId}', [FavoriteController::class, 'destroy']);
        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::get('/favorites/status', [FavoriteController::class, 'status']);
    });

    Route::middleware(['auth:sanctum', 'user.approved'])->group(function () {
        Route::get('/live/{match}/chat', [MatchChatController::class, 'index']);
        Route::post('/live/{match}/chat', [MatchChatController::class, 'store']);
        Route::post('/live/{match}/chat/announcement', [MatchChatController::class, 'announcement']);
        Route::post('/live/{match}/chat/read', [MatchChatController::class, 'read']);
        Route::get('/live/{match}/chat/read', [MatchChatController::class, 'readStatus']);
        Route::post('/live/{match}/chat/mute', [MatchChatController::class, 'mute']);
        Route::delete('/live/{match}/chat/mute', [MatchChatController::class, 'unmute']);
        Route::post('/chat/messages/{message}/report', [MatchChatController::class, 'report']);
        Route::put('/chat/messages/{message}', [MatchChatController::class, 'update']);
        Route::delete('/chat/messages/{message}', [MatchChatController::class, 'destroy']);
        Route::post('/chat/messages/{message}/pin', [MatchChatController::class, 'pin']);

        Route::post('/players/{player}/reviews/{match}', [PlayerReviewController::class, 'store']);
        Route::put('/reviews/player/{review}', [PlayerReviewController::class, 'update']);
        Route::delete('/reviews/player/{review}', [PlayerReviewController::class, 'destroy']);

        Route::post('/stadiums/{stadium}/reviews/{booking}', [StadiumReviewController::class, 'store']);
        Route::put('/reviews/stadium/{review}', [StadiumReviewController::class, 'update']);
        Route::delete('/reviews/stadium/{review}', [StadiumReviewController::class, 'destroy']);
    });
});

Route::get('/stadiums', [StadiumController::class, 'index']);
Route::get('/terrains/public', [StadiumController::class, 'publicTerrains']);

Route::get('/leaderboard', [LeaderboardController::class, 'index']);
Route::get('/leaderboard/players', [PlayerLeaderboardController::class, 'index']);

Route::get('/terrains/{terrainId}/slots', [BookingController::class, 'getTerrainSlots']);

Route::get('/facilities', [FacilityController::class, 'index']);

// Cities (public)
Route::get('/cities', [CityController::class, 'index']);
Route::get('/cities/select', [CityController::class, 'listForSelect']);
Route::get('/cities/{city}', [CityController::class, 'show']);

Route::get('/settings/public', [SettingsController::class, 'publicSettings']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
});

Route::middleware(['auth:sanctum', 'user.approved'])->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{id}/pin', [NotificationController::class, 'togglePin']);
    Route::put('/notifications/{id}/important', [NotificationController::class, 'toggleImportant']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::get('/notifications/preferences', [NotificationController::class, 'preferences']);
    Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    Route::get('/notifications/v1', [NotificationController::class, 'indexV1']);

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/managers', [ManagerApprovalController::class, 'index']);
        Route::post('/managers/bulk', [ManagerApprovalController::class, 'bulk']);
        Route::get('/managers/{id}', [ManagerApprovalController::class, 'show']);
        Route::put('/managers/{id}/approve', [ManagerApprovalController::class, 'approve']);
        Route::put('/managers/{id}/reject', [ManagerApprovalController::class, 'reject']);
        Route::put('/managers/{id}/block', [ManagerApprovalController::class, 'block']);
        Route::put('/managers/{id}/unblock', [ManagerApprovalController::class, 'unblock']);
        Route::get('/stats', [ManagerApprovalController::class, 'stats']);

        Route::get('/terrain-owners', [ManagerApprovalController::class, 'terrainOwners']);
        Route::post('/terrain-owners/bulk', [ManagerApprovalController::class, 'bulkTerrainOwners']);
        Route::get('/terrain-owners/{id}', [ManagerApprovalController::class, 'showTerrainOwner']);
        Route::put('/terrain-owners/{id}/approve', [ManagerApprovalController::class, 'approveTerrainOwner']);
        Route::put('/terrain-owners/{id}/reject', [ManagerApprovalController::class, 'rejectTerrainOwner']);
        Route::put('/terrain-owners/{id}/block', [ManagerApprovalController::class, 'blockTerrainOwner']);
        Route::put('/terrain-owners/{id}/unblock', [ManagerApprovalController::class, 'unblockTerrainOwner']);

        Route::get('/players', [PlayerApprovalController::class, 'index']);
        Route::post('/players/bulk', [PlayerApprovalController::class, 'bulk']);
        Route::get('/players/{id}', [PlayerApprovalController::class, 'show']);
        Route::put('/players/{id}/approve', [PlayerApprovalController::class, 'approve']);
        Route::put('/players/{id}/reject', [PlayerApprovalController::class, 'reject']);
        Route::put('/players/{id}/block', [PlayerApprovalController::class, 'block']);
        Route::put('/players/{id}/unblock', [PlayerApprovalController::class, 'unblock']);

        Route::get('/committees', [CommitteeApprovalController::class, 'index']);
        Route::post('/committees/bulk', [CommitteeApprovalController::class, 'bulk']);
        Route::get('/committees/{id}', [CommitteeApprovalController::class, 'show']);
        Route::put('/committees/{id}/approve', [CommitteeApprovalController::class, 'approve']);
        Route::put('/committees/{id}/reject', [CommitteeApprovalController::class, 'reject']);
        Route::put('/committees/{id}/block', [CommitteeApprovalController::class, 'block']);
        Route::put('/committees/{id}/unblock', [CommitteeApprovalController::class, 'unblock']);

        Route::get('/activities', [ActivityLogController::class, 'index']);

        Route::get('/settings', [SettingsController::class, 'index']);
        Route::put('/settings', [SettingsController::class, 'update']);

        Route::get('/moderation/reports', [ModerationController::class, 'reports']);
        Route::get('/moderation/hidden', [ModerationController::class, 'hidden']);
        Route::put('/moderation/reports/{report}', [ModerationController::class, 'resolve']);
        Route::post('/moderation/hide/{targetType}/{targetId}', [ModerationController::class, 'hide']);
        Route::post('/moderation/unhide/{targetType}/{targetId}', [ModerationController::class, 'unhide']);
        Route::put('/moderation/users/{user}/block', [ModerationController::class, 'block']);
        Route::put('/moderation/users/{user}/unblock', [ModerationController::class, 'unblock']);

        Route::apiResource('facilities', FacilityController::class)->except('show');
    });

    Route::middleware('committee.approved')->prefix('committee')->group(function () {
        Route::get('/teams', [CommitteeTeamController::class, 'index']);
        Route::get('/tournaments', [TournamentController::class, 'index']);
        Route::post('/tournaments', [TournamentController::class, 'store']);

        Route::get('/referees', [CommitteeRefereeController::class, 'index']);
        Route::post('/referees', [CommitteeRefereeController::class, 'store']);

        Route::get('/teams/{team}/players', [CommitteeTeamPlayerController::class, 'index']);
        Route::post('/teams/{team}/players', [CommitteeTeamPlayerController::class, 'store']);

        Route::scopeBindings()->prefix('tournaments/{tournament}')->group(function () {
            Route::get('/', [TournamentController::class, 'show']);
            Route::put('/', [TournamentController::class, 'update']);
            Route::delete('/', [TournamentController::class, 'destroy']);
            Route::post('/publish', [TournamentController::class, 'publish']);
            Route::get('/progress', [TournamentController::class, 'progress']);

            Route::get('/teams', [TournamentTeamController::class, 'index']);
            Route::post('/teams', [TournamentTeamController::class, 'store']);
            Route::post('/teams/free', [TournamentTeamController::class, 'storeFree']);
            Route::put('/teams/group', [TournamentTeamController::class, 'assignGroup']);
            Route::delete('/teams/{teamId}', [TournamentTeamController::class, 'destroy']);

            Route::get('/stadiums', [TournamentStadiumController::class, 'index']);
            Route::put('/stadiums', [TournamentStadiumController::class, 'store']);

            Route::get('/draw', [TournamentDrawController::class, 'show']);
            Route::post('/draw', [TournamentDrawController::class, 'store']);
            Route::put('/draw/team', [TournamentDrawController::class, 'assign']);
            Route::put('/draw/teams', [TournamentDrawController::class, 'save']);
            Route::delete('/draw', [TournamentDrawController::class, 'destroy']);

            Route::get('/fixtures', [TournamentFixtureController::class, 'index']);
            Route::post('/fixtures', [TournamentFixtureController::class, 'store']);
            Route::delete('/fixtures', [TournamentFixtureController::class, 'destroy']);
            Route::get('/match-rounds', [TournamentFixtureController::class, 'matchRounds']);
            Route::put('/fixtures/{fixture}', [TournamentFixtureController::class, 'reschedule']);
            Route::post('/fixtures/{fixture}/postpone', [TournamentFixtureController::class, 'postpone']);
            Route::post('/fixtures/{fixture}/cancel', [TournamentFixtureController::class, 'cancel']);

            Route::post('/fixtures/{fixture}/result', [TournamentResultController::class, 'store']);
            Route::get('/fixtures/{fixture}/result', [TournamentResultController::class, 'show']);
            Route::put('/fixtures/{fixture}/result', [TournamentResultController::class, 'update']);
            Route::delete('/fixtures/{fixture}/result', [TournamentResultController::class, 'destroy']);

            Route::get('/fixtures/{fixture}/events', [TournamentMatchEventController::class, 'index']);
            Route::post('/fixtures/{fixture}/events', [TournamentMatchEventController::class, 'store']);
            Route::put('/fixtures/{fixture}/events/{event}', [TournamentMatchEventController::class, 'update']);
            Route::delete('/fixtures/{fixture}/events/{event}', [TournamentMatchEventController::class, 'destroy']);

            Route::get('/standings', [TournamentStandingController::class, 'index']);

            Route::get('/bracket', [TournamentBracketController::class, 'index']);
            Route::post('/bracket', [TournamentBracketController::class, 'store']);
            Route::post('/bracket/populate', [TournamentBracketController::class, 'populate']);

            Route::get('/statistics', [TournamentStatisticsController::class, 'index']);
        });
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
        Route::post('/manager/match-requests/{id}/start', [MatchRequestController::class, 'start']);

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

        Route::get('/manager/recruitment/search', [PlayerRecruitController::class, 'search']);
        Route::post('/manager/recruitment/{playerId}/invite', [PlayerRecruitController::class, 'invite']);
        Route::get('/manager/matches/{matchId}/applicants', [PlayerRecruitController::class, 'applicants']);
        Route::put('/manager/recruitment/applications/{applicationId}/respond', [PlayerRecruitController::class, 'respond']);
    });

    Route::middleware('player.approved')->prefix('player')->group(function () {
        Route::get('/profile', [PlayerProfileController::class, 'profile']);
        Route::put('/profile', [PlayerProfileController::class, 'updateProfile']);
        Route::post('/profile/photo', [PlayerProfileController::class, 'uploadPhoto']);
        Route::get('/match-feed', [PlayerProfileController::class, 'matchFeed']);
        Route::post('/matches/{matchId}/apply', [PlayerProfileController::class, 'apply']);
        Route::get('/applications', [PlayerProfileController::class, 'applications']);
        Route::put('/applications/{applicationId}/respond', [PlayerProfileController::class, 'respond']);
        Route::put('/applications/{applicationId}/cancel', [PlayerProfileController::class, 'cancel']);
        Route::get('/matches', [PlayerProfileController::class, 'matches']);
        Route::get('/stats', [PlayerProfileController::class, 'stats']);
    });

    Route::middleware('terrain.owner')->prefix('owner')->group(function () {
        Route::get('/terrains', [TerrainOwnerController::class, 'index']);
        Route::get('/terrains/{id}', [TerrainOwnerController::class, 'show']);
        Route::post('/terrains', [TerrainOwnerController::class, 'store']);
        Route::put('/terrains/{id}', [TerrainOwnerController::class, 'update']);
        Route::delete('/terrains/{id}', [TerrainOwnerController::class, 'destroy']);
        Route::post('/terrains/{id}/images', [TerrainOwnerController::class, 'uploadImages']);
        Route::delete('/terrains/{terrainId}/images/{imageId}', [TerrainOwnerController::class, 'destroyImage']);
        Route::put('/terrains/{id}/cover', [TerrainOwnerController::class, 'setCover']);
        Route::get('/stats', [TerrainOwnerController::class, 'stats']);
        Route::get('/analytics/overview', [TerrainOwnerController::class, 'overviewAnalytics']);
        Route::get('/bookings', [TerrainOwnerController::class, 'upcomingBookings']);

        Route::put('/terrains/{id}/toggle-status', [OwnerTerrainController::class, 'toggleStatus']);
        Route::put('/terrains/{id}/working-hours', [OwnerTerrainController::class, 'updateWorkingHours']);

        Route::get('/terrains/{terrainId}/calendar', [BookingController::class, 'getOwnerCalendar']);
        Route::put('/bookings/{bookingId}/status', [BookingController::class, 'ownerManageBooking']);

        Route::post('/terrains/{terrainId}/guest-bookings', [BookingController::class, 'ownerCreateGuestBooking']);

        Route::put('/bookings/{id}/approve', [OwnerBookingController::class, 'approve']);
        Route::put('/bookings/{id}/reject', [OwnerBookingController::class, 'reject']);
        Route::get('/cancellation-requests', [OwnerBookingController::class, 'cancellationRequests']);
        Route::put('/cancellation-requests/{cancellationId}', [OwnerBookingController::class, 'handleCancellation']);

        Route::get('/terrains/{terrainId}/slot-closures', [SlotClosureController::class, 'index']);
        Route::post('/terrains/{terrainId}/slot-closures', [SlotClosureController::class, 'store']);
        Route::delete('/terrains/{terrainId}/slot-closures/{closureId}', [SlotClosureController::class, 'destroy']);
    });
});
