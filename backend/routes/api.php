<?php

use App\Domains\Booking\Controllers\BookingController as V1BookingController;
use App\Domains\Chat\Controllers\MatchChatController;
use App\Domains\Competition\Controllers\CompetitionController;
use App\Domains\Device\Controllers\DeviceController;
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
use App\Domains\Subscription\Controllers\MySubscriptionController;
use App\Domains\Subscription\Controllers\PlansController;
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
use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\SubAdminController;
use App\Http\Controllers\Admin\CityController as AdminCityController;
use App\Http\Controllers\Admin\CommitteeApprovalController;
use App\Http\Controllers\Admin\ContactMessageController;
use App\Http\Controllers\Admin\FacilityController;
use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\AdminPlayerTeamRequestController;
use App\Http\Controllers\Admin\ManagerApprovalController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\Admin\UserSubscriptionController;
use App\Http\Controllers\Admin\PlayerApprovalController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Committee\CommitteeRefereeController;
use App\Http\Controllers\Committee\CommitteeTeamController;
use App\Http\Controllers\Committee\CommitteeTeamPlayerController;
use App\Http\Controllers\Committee\TournamentBracketController;
use App\Http\Controllers\Committee\TournamentBrandingController;
use App\Http\Controllers\Committee\TournamentController;
use App\Http\Controllers\Committee\TournamentDrawController;
use App\Http\Controllers\Committee\TournamentFixtureController;
use App\Http\Controllers\Committee\TournamentGalleryController;
use App\Http\Controllers\Committee\TournamentMatchEventController;
use App\Http\Controllers\Committee\TournamentNewsController;
use App\Http\Controllers\Committee\TournamentPartnerController;
use App\Http\Controllers\Committee\TournamentResultController;
use App\Http\Controllers\Committee\TournamentSquadController;
use App\Http\Controllers\Committee\TournamentStadiumController;
use App\Http\Controllers\Committee\TournamentStandingController;
use App\Http\Controllers\Committee\TournamentStatisticsController;
use App\Http\Controllers\Committee\TournamentTeamController;
use App\Http\Controllers\Committee\TournamentContactController;
use App\Http\Controllers\Committee\TournamentSponsorController;
use App\Http\Controllers\Manager\MatchFeedController;
use App\Http\Controllers\Manager\ManagerLineupController;
use App\Http\Controllers\Manager\MatchRequestController;
use App\Http\Controllers\Manager\MatchResultController;
use App\Http\Controllers\Manager\PlayerController;
use App\Http\Controllers\Manager\PlayerRecruitController;
use App\Http\Controllers\Manager\PublicTeamController;
use App\Http\Controllers\Manager\TeamMembershipController;
use App\Http\Controllers\Manager\TeamProfileController;
use App\Http\Controllers\Manager\TournamentController as ManagerTournamentController;
use App\Http\Controllers\Manager\TournamentSquadController as ManagerTournamentSquadController;
use App\Http\Controllers\Player\PlayerController as PlayerProfileController;
use App\Http\Controllers\Public\LeaderboardController;
use App\Http\Controllers\Public\PlayerLeaderboardController;
use App\Http\Controllers\Public\PublicTournamentController;
use App\Http\Controllers\Public\TournamentRegistrationController;
use App\Http\Controllers\Public\PublicContactController;
use App\Http\Controllers\Public\PublicManagerController;
use App\Http\Controllers\Public\PublicTournamentContactController;
use App\Http\Controllers\Public\TeamProfileController as PublicTeamProfileController;
use App\Http\Controllers\Public\PlayerProfileController as PublicPlayerProfileController;
use App\Http\Controllers\Public\TerrainOwnerProfileController;
use App\Http\Controllers\Public\CommitteeMemberProfileController;
use App\Http\Controllers\StadiumController;
use App\Http\Controllers\Terrain\BookingController;
use App\Http\Controllers\Terrain\DirectBookingController;
use App\Http\Controllers\Terrain\OwnerBookingController;
use App\Http\Controllers\Terrain\OwnerTerrainController;
use App\Http\Controllers\Terrain\SlotClosureController;
use App\Http\Controllers\Terrain\TerrainOwnerController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/register-terrain-owner', [AuthController::class, 'registerTerrainOwner'])->middleware('throttle:auth');
Route::post('/register-player', [AuthController::class, 'registerPlayer'])->middleware('throttle:auth');
Route::post('/register-committee', [AuthController::class, 'registerCommittee'])->middleware('throttle:auth');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// Self-service password recovery
Route::post('/forgot-password', [\App\Http\Controllers\Auth\PasswordResetController::class, 'sendResetLink'])->middleware('throttle:password');
Route::post('/forgot-password/validate-token', [\App\Http\Controllers\Auth\PasswordResetController::class, 'validateToken'])->middleware('throttle:password');
Route::post('/reset-password', [\App\Http\Controllers\Auth\PasswordResetController::class, 'reset'])->middleware('throttle:password');

Route::get('/health', \App\Http\Controllers\HealthController::class);

Route::prefix('v1')->group(function () {
    Route::get('/home', [HomeController::class, 'index']);
    Route::get('/plans', [PlansController::class, 'index']);
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
    Route::get('/tournaments/{tournament}/news', [PublicTournamentController::class, 'news']);
    Route::get('/tournaments/{tournament}/news/{news}', [PublicTournamentController::class, 'newsDetail']);
    Route::get('/tournaments/{tournament}/gallery', [PublicTournamentController::class, 'gallery']);
    Route::get('/tournaments/{tournament}/sponsors', [PublicTournamentController::class, 'sponsors']);
    Route::get('/tournaments/{tournament}/partners', [PublicTournamentController::class, 'partners']);
    Route::get('/tournaments/{tournament}/registration', [TournamentRegistrationController::class, 'availability']);
    Route::get('/tournaments/{tournament}/matches/{match}', [PublicTournamentController::class, 'matchDetail']);
    Route::get('/tournaments/{tournament}/contact', [PublicTournamentContactController::class, 'contact']);
    Route::post('/tournaments/{tournament}/contact/messages', [PublicTournamentContactController::class, 'storeMessage'])->middleware('throttle:contact');

    Route::get('/contact', [PublicContactController::class, 'contact']);
    Route::post('/contact/messages', [PublicContactController::class, 'storeMessage'])->middleware('throttle:contact');

    Route::get('/managers/{managerId}', [PublicManagerController::class, 'show']);

    Route::get('/teams/{team}/profile', [PublicTeamProfileController::class, 'show']);
    Route::get('/players/{player}/profile', [PublicPlayerProfileController::class, 'show']);
    Route::get('/terrain-owners/{id}/profile', [TerrainOwnerProfileController::class, 'show']);
    Route::get('/committee-members/{id}/profile', [CommitteeMemberProfileController::class, 'show']);

    Route::middleware(['auth:sanctum', 'module.maintenance:tournaments'])->group(function () {
        Route::get('/tournaments/{tournament}/registration/me', [TournamentRegistrationController::class, 'me']);

        Route::middleware(['activity.not_locked', 'throttle:team-request'])->group(function () {
            Route::post('/tournaments/{tournament}/registration', [TournamentRegistrationController::class, 'register']);
            Route::delete('/tournaments/{tournament}/registration', [TournamentRegistrationController::class, 'destroy']);
        });
    });

    Route::middleware(['auth:sanctum', 'user.approved', 'activity.not_locked', 'module.maintenance:bookings', 'throttle:booking'])->prefix('bookings')->group(function () {
        Route::post('/confirm', [V1BookingController::class, 'confirm']);
        Route::post('/{booking}/payment-intent', [V1BookingController::class, 'paymentIntent']);
        Route::post('/{booking}/cancel', [V1BookingController::class, 'cancel']);
    });

    Route::middleware(['auth:sanctum', 'user.approved', 'module.maintenance:bookings'])->prefix('bookings')->group(function () {
        Route::get('/history', [V1BookingController::class, 'history']);
        Route::get('/upcoming', [V1BookingController::class, 'upcoming']);
        Route::get('/{booking}', [V1BookingController::class, 'show']);
        Route::get('/{booking}/receipt', [V1BookingController::class, 'receipt']);
    });

    Route::middleware(['auth:sanctum', 'manager.approved', 'module.maintenance:teams'])->prefix('manager/team')->group(function () {
        Route::get('/', [V1TeamProfileController::class, 'show']);

        Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
            Route::put('/', [V1TeamProfileController::class, 'update']);
            Route::post('/logo', [V1TeamProfileController::class, 'uploadLogo']);
            Route::post('/cover', [V1TeamProfileController::class, 'uploadCover']);
        });

        Route::get('/gallery', [TeamGalleryController::class, 'index']);

        Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
            Route::post('/gallery', [TeamGalleryController::class, 'store']);
            Route::post('/gallery/reorder', [TeamGalleryController::class, 'reorder']);
            Route::put('/gallery/{image}/cover', [TeamGalleryController::class, 'setCover']);
            Route::delete('/gallery/{image}', [TeamGalleryController::class, 'destroy']);
        });

        Route::get('/statistics', [TeamStatisticsController::class, 'index']);

        Route::get('/fixtures/upcoming', [TeamFixtureController::class, 'upcoming']);
        Route::get('/fixtures/history', [TeamFixtureController::class, 'history']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/attendance', [V1AttendanceController::class, 'store']);
        });

        Route::get('/attendance', [V1AttendanceController::class, 'index']);

        Route::get('/formation', [TeamFormationController::class, 'show']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::put('/formation', [TeamFormationController::class, 'update']);
            Route::put('/captain/{player}', [CaptainController::class, 'assignCaptain']);
            Route::put('/vice-captain/{player}', [CaptainController::class, 'assignViceCaptain']);
            Route::delete('/captain', [CaptainController::class, 'removeCaptain']);
            Route::delete('/vice-captain', [CaptainController::class, 'removeViceCaptain']);
        });

        Route::get('/announcements', [TeamAnnouncementController::class, 'index']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/announcements', [TeamAnnouncementController::class, 'store']);
        });

        Route::get('/announcements/{announcement}', [TeamAnnouncementController::class, 'show']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::put('/announcements/{announcement}', [TeamAnnouncementController::class, 'update']);
            Route::delete('/announcements/{announcement}', [TeamAnnouncementController::class, 'destroy']);
        });

        Route::get('/dashboard', [TeamDashboardController::class, 'index']);

        Route::get('/players', [V1PlayerController::class, 'index']);
        Route::get('/players/{player}', [V1PlayerController::class, 'show']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/players', [V1PlayerController::class, 'store']);
            Route::put('/players/{player}', [V1PlayerController::class, 'update']);
            Route::delete('/players/{player}', [V1PlayerController::class, 'destroy']);
        });
    });

    // Spec alias: /api/v1/team/statistics -> same as /api/v1/manager/team/statistics
    Route::middleware(['auth:sanctum', 'manager.approved', 'module.maintenance:teams'])->group(function () {
        Route::get('/team/statistics', [TeamStatisticsController::class, 'index']);
    });

    Route::middleware(['auth:sanctum', 'manager.approved', 'activity.not_locked', 'module.maintenance:matches', 'throttle:match-live'])->prefix('live')->group(function () {
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

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/announcements/{announcement}/read', [TeamAnnouncementController::class, 'markRead']);
        });
    });

    Route::middleware(['auth:sanctum', 'module.maintenance:players'])->prefix('player')->group(function () {
        Route::get('/leaderboard', [V1PlayerLeaderboardController::class, 'index']);
        Route::get('/profiles/{userId}', [ProfileController::class, 'showUser']);
        Route::get('/profiles/{userId}/gallery', [GalleryController::class, 'indexForUser']);
        Route::get('/profiles/{userId}/career', [CareerController::class, 'historyForUser']);
        Route::get('/profiles/{userId}/achievements', [AchievementController::class, 'forUser']);

        Route::middleware('player.approved')->group(function () {
            Route::get('/dashboard', [PlayerDashboardController::class, 'index']);

            Route::get('/profile', [ProfileController::class, 'show']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::put('/profile', [ProfileController::class, 'update']);
                Route::post('/profile/photo', [ProfileController::class, 'uploadPhoto']);
                Route::post('/profile/cover', [ProfileController::class, 'uploadCover']);
                Route::put('/profile/availability-status', [ProfileController::class, 'setAvailabilityStatus']);
            });

            Route::get('/gallery', [GalleryController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::post('/gallery', [GalleryController::class, 'store']);
                Route::post('/gallery/reorder', [GalleryController::class, 'reorder']);
                Route::put('/gallery/{image}/cover', [GalleryController::class, 'setCover']);
                Route::put('/gallery/{image}', [GalleryController::class, 'update']);
                Route::delete('/gallery/{image}', [GalleryController::class, 'destroy']);
            });

            Route::get('/statistics', [StatisticsController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/statistics/sync', [StatisticsController::class, 'sync']);
            });

            Route::get('/statistics/ratings', [StatisticsController::class, 'ratings']);

            Route::get('/career', [CareerController::class, 'history']);
            Route::get('/career/transfers', [CareerController::class, 'transfers']);

            Route::get('/availability', [AvailabilityController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/availability', [AvailabilityController::class, 'store']);
                Route::put('/availability/{slot}', [AvailabilityController::class, 'update']);
                Route::delete('/availability/{slot}', [AvailabilityController::class, 'destroy']);
            });

            Route::get('/achievements', [AchievementController::class, 'index']);
            Route::get('/achievements/unlocked', [AchievementController::class, 'unlocked']);

            Route::get('/performance', [PerformanceController::class, 'recent']);
            Route::get('/performance/heatmap', [PerformanceController::class, 'heatmap']);
            Route::get('/performance/positions', [PerformanceController::class, 'positionBreakdown']);
            Route::get('/performance/best', [PerformanceController::class, 'best']);
            Route::get('/performance/form', [PerformanceController::class, 'form']);

            Route::get('/settings', [V1PlayerSettingsController::class, 'show']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::put('/settings', [V1PlayerSettingsController::class, 'update']);
            });

            Route::get('/resources', [ResourcesController::class, 'index']);
            Route::get('/events', [EventsController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:password'])->group(function () {
                Route::post('/security/password', [SecurityController::class, 'updatePassword']);
            });

            Route::get('/security/sessions', [SecurityController::class, 'sessions']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::delete('/security/sessions/{tokenId}', [SecurityController::class, 'revokeSession']);
                Route::post('/security/sessions/revoke-others', [SecurityController::class, 'revokeOtherSessions']);
            });
        });
    });

    Route::middleware(['auth:sanctum', 'user.approved', 'module.maintenance:social'])->prefix('social')->group(function () {
        Route::get('/search', [SearchController::class, 'search']);
        Route::get('/search/suggest', [SearchController::class, 'suggest']);
        Route::get('/search/recent', [SearchController::class, 'recent']);
        Route::get('/search/popular', [SearchController::class, 'popular']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/comments', [CommentController::class, 'store']);
            Route::post('/comments/{comment}/reply', [CommentController::class, 'reply']);
            Route::put('/comments/{comment}', [CommentController::class, 'update']);
            Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
            Route::post('/comments/{comment}/like', [CommentController::class, 'like']);
            Route::post('/comments/{comment}/pin', [CommentController::class, 'pin']);
            Route::post('/comments/{comment}/report', [CommentController::class, 'report']);

            Route::post('/reactions', [ReactionController::class, 'store']);
            Route::delete('/reactions', [ReactionController::class, 'destroy']);
        });

        Route::get('/reactions', [ReactionController::class, 'show']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/follow', [FollowController::class, 'store']);
            Route::delete('/follow/{targetType}/{targetId}', [FollowController::class, 'destroy']);
        });

        Route::get('/followers', [FollowController::class, 'followers']);
        Route::get('/following', [FollowController::class, 'following']);
        Route::get('/follow/status', [FollowController::class, 'status']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/favorites', [FavoriteController::class, 'store']);
            Route::delete('/favorites/{targetType}/{targetId}', [FavoriteController::class, 'destroy']);
        });

        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::get('/favorites/status', [FavoriteController::class, 'status']);
    });

    Route::middleware(['auth:sanctum', 'user.approved', 'module.maintenance:chat'])->group(function () {
        Route::get('/live/{match}/chat', [MatchChatController::class, 'index']);
        Route::get('/live/{match}/chat/read', [MatchChatController::class, 'readStatus']);

        Route::middleware(['activity.not_locked', 'throttle:chat'])->group(function () {
            Route::post('/live/{match}/chat', [MatchChatController::class, 'store']);
            Route::post('/live/{match}/chat/announcement', [MatchChatController::class, 'announcement']);
            Route::post('/live/{match}/chat/read', [MatchChatController::class, 'read']);
            Route::post('/live/{match}/chat/mute', [MatchChatController::class, 'mute']);
            Route::delete('/live/{match}/chat/mute', [MatchChatController::class, 'unmute']);
            Route::post('/chat/messages/{message}/report', [MatchChatController::class, 'report']);
            Route::put('/chat/messages/{message}', [MatchChatController::class, 'update']);
            Route::delete('/chat/messages/{message}', [MatchChatController::class, 'destroy']);
            Route::post('/chat/messages/{message}/pin', [MatchChatController::class, 'pin']);
        });
    });

    Route::middleware(['auth:sanctum', 'user.approved', 'module.maintenance:reviews'])->group(function () {
        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/players/{player}/reviews/{match}', [PlayerReviewController::class, 'store']);
            Route::put('/reviews/player/{review}', [PlayerReviewController::class, 'update']);
            Route::delete('/reviews/player/{review}', [PlayerReviewController::class, 'destroy']);

            Route::post('/stadiums/{stadium}/reviews/{booking}', [StadiumReviewController::class, 'store']);
            Route::put('/reviews/stadium/{review}', [StadiumReviewController::class, 'update']);
            Route::delete('/reviews/stadium/{review}', [StadiumReviewController::class, 'destroy']);
        });
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
    Route::get('/me/subscription', [MySubscriptionController::class, 'show']);

    Route::middleware('activity.not_locked')->group(function () {
        Route::put('/me', [AuthController::class, 'updateProfile']);
        Route::post('/me/avatar', [AuthController::class, 'uploadAvatar'])->middleware('throttle:upload');
        Route::delete('/me/avatar', [AuthController::class, 'removeAvatar']);
    });
});

Route::middleware(['auth:sanctum', 'throttle:device'])->prefix('devices')->group(function () {
    Route::get('/', [DeviceController::class, 'index']);
    Route::post('/', [DeviceController::class, 'store']);
    Route::delete('/', [DeviceController::class, 'destroyByToken']);
    Route::delete('/{device}', [DeviceController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/recovery/apply', [AccountController::class, 'applyRecovery'])->middleware('throttle:password');
});

Route::middleware(['auth:sanctum', 'user.approved'])->group(function () {
    Route::middleware('module.maintenance:notifications')->prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::get('/preferences', [NotificationController::class, 'preferences']);
        Route::get('/v1', [NotificationController::class, 'indexV1']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::put('/read-all', [NotificationController::class, 'markAllAsRead']);
            Route::put('/{id}/pin', [NotificationController::class, 'togglePin']);
            Route::put('/{id}/important', [NotificationController::class, 'toggleImportant']);
            Route::delete('/{id}', [NotificationController::class, 'destroy']);
            Route::put('/preferences', [NotificationController::class, 'updatePreferences']);
        });
    });

    Route::prefix('admin')->middleware(['admin', 'throttle:admin'])->group(function () {
        Route::get('/permissions', [SubAdminController::class, 'permissions']);
        Route::apiResource('sub-admins', SubAdminController::class)->except('create', 'edit');
        Route::put('/sub-admins/{id}/permissions', [SubAdminController::class, 'updatePermissions']);
        Route::put('/sub-admins/{id}/status', [SubAdminController::class, 'updateStatus']);
    });

    Route::prefix('admin')->middleware(['admin.access', 'throttle:admin'])->group(function () {
        Route::get('/stats', [ManagerApprovalController::class, 'stats']);

        Route::middleware('permission:users.view')->group(function () {
            Route::get('/managers', [ManagerApprovalController::class, 'index']);
            Route::get('/managers/{id}', [ManagerApprovalController::class, 'show']);
            Route::get('/terrain-owners', [ManagerApprovalController::class, 'terrainOwners']);
            Route::get('/terrain-owners/{id}', [ManagerApprovalController::class, 'showTerrainOwner']);
            Route::get('/players', [PlayerApprovalController::class, 'index']);
            Route::get('/players/{id}', [PlayerApprovalController::class, 'show']);
            Route::get('/committees', [CommitteeApprovalController::class, 'index']);
            Route::get('/committees/{id}', [CommitteeApprovalController::class, 'show']);
            Route::get('/accounts/{id}/recoveries', [AccountController::class, 'recoveries']);
        });

        Route::middleware('permission:users.manage')->group(function () {
            Route::put('/accounts/{id}/lock-activity', [AccountController::class, 'lockActivity']);
            Route::put('/accounts/{id}/unlock-activity', [AccountController::class, 'unlockActivity']);

            Route::post('/managers/bulk', [ManagerApprovalController::class, 'bulk']);
            Route::put('/managers/{id}/approve', [ManagerApprovalController::class, 'approve']);
            Route::put('/managers/{id}/reject', [ManagerApprovalController::class, 'reject']);
            Route::put('/managers/{id}/block', [ManagerApprovalController::class, 'block']);
            Route::put('/managers/{id}/unblock', [ManagerApprovalController::class, 'unblock']);

            Route::post('/terrain-owners/bulk', [ManagerApprovalController::class, 'bulkTerrainOwners']);
            Route::put('/terrain-owners/{id}/approve', [ManagerApprovalController::class, 'approveTerrainOwner']);
            Route::put('/terrain-owners/{id}/reject', [ManagerApprovalController::class, 'rejectTerrainOwner']);
            Route::put('/terrain-owners/{id}/block', [ManagerApprovalController::class, 'blockTerrainOwner']);
            Route::put('/terrain-owners/{id}/unblock', [ManagerApprovalController::class, 'unblockTerrainOwner']);

            Route::post('/players/bulk', [PlayerApprovalController::class, 'bulk']);
            Route::put('/players/{id}/approve', [PlayerApprovalController::class, 'approve']);
            Route::put('/players/{id}/reject', [PlayerApprovalController::class, 'reject']);
            Route::put('/players/{id}/block', [PlayerApprovalController::class, 'block']);
            Route::put('/players/{id}/unblock', [PlayerApprovalController::class, 'unblock']);

            Route::post('/committees/bulk', [CommitteeApprovalController::class, 'bulk']);
            Route::put('/committees/{id}/approve', [CommitteeApprovalController::class, 'approve']);
            Route::put('/committees/{id}/reject', [CommitteeApprovalController::class, 'reject']);
            Route::put('/committees/{id}/block', [CommitteeApprovalController::class, 'block']);
            Route::put('/committees/{id}/unblock', [CommitteeApprovalController::class, 'unblock']);
        });

        Route::middleware('permission:users.accounts')->group(function () {
            Route::delete('/accounts/{id}', [AccountController::class, 'delete']);
            Route::post('/accounts/{id}/recovery', [AccountController::class, 'generateRecovery']);
        });

        Route::middleware('permission:analytics.view')->group(function () {
            Route::get('/analytics/platform', [AnalyticsController::class, 'platform']);
        });

        Route::middleware('permission:activity.view')->group(function () {
            Route::get('/activities', [ActivityLogController::class, 'index']);
        });

        Route::middleware('permission:settings.view')->group(function () {
            Route::get('/settings', [SettingsController::class, 'index']);
            Route::get('/maintenance-modules', [SettingsController::class, 'maintenanceIndex']);
            Route::get('/page-maintenance', [SettingsController::class, 'pageMaintenanceIndex']);
        });

        Route::middleware('permission:settings.manage')->group(function () {
            Route::put('/settings', [SettingsController::class, 'update']);
            Route::put('/maintenance-modules/{module}', [SettingsController::class, 'maintenanceUpdate']);
            Route::delete('/maintenance-modules/{module}', [SettingsController::class, 'maintenanceDestroy']);
            Route::put('/page-maintenance', [SettingsController::class, 'pageMaintenanceUpdate']);
            Route::delete('/page-maintenance', [SettingsController::class, 'pageMaintenanceDestroy']);
        });

        Route::middleware('permission:messages.view')->group(function () {
            Route::get('/contact-messages', [ContactMessageController::class, 'index']);
            Route::get('/contact-messages/{message}', [ContactMessageController::class, 'show']);
        });

        Route::middleware('permission:messages.manage')->group(function () {
            Route::put('/contact-messages/{message}/status', [ContactMessageController::class, 'updateStatus']);
            Route::delete('/contact-messages/{message}', [ContactMessageController::class, 'destroy']);
        });

        Route::middleware('permission:users.view')->group(function () {
            Route::get('/player-team-requests', [AdminPlayerTeamRequestController::class, 'index']);
            Route::get('/player-team-requests/{id}', [AdminPlayerTeamRequestController::class, 'show']);
        });

        Route::middleware('permission:users.manage')->group(function () {
            Route::put('/player-team-requests/{id}/approve', [AdminPlayerTeamRequestController::class, 'approve']);
            Route::put('/player-team-requests/{id}/reject', [AdminPlayerTeamRequestController::class, 'reject']);
        });

        Route::middleware('permission:moderation.view')->group(function () {
            Route::get('/moderation/reports', [ModerationController::class, 'reports']);
            Route::get('/moderation/hidden', [ModerationController::class, 'hidden']);
        });

        Route::middleware('permission:moderation.manage')->group(function () {
            Route::put('/moderation/reports/{report}', [ModerationController::class, 'resolve']);
            Route::post('/moderation/hide/{targetType}/{targetId}', [ModerationController::class, 'hide']);
            Route::post('/moderation/unhide/{targetType}/{targetId}', [ModerationController::class, 'unhide']);
            Route::put('/moderation/users/{user}/block', [ModerationController::class, 'block']);
            Route::put('/moderation/users/{user}/unblock', [ModerationController::class, 'unblock']);
        });

        Route::middleware('permission:facilities.view')->group(function () {
            Route::get('/facilities', [FacilityController::class, 'index']);
            Route::get('/facilities/{facility}', [FacilityController::class, 'show']);
        });

        Route::middleware('permission:facilities.manage')->group(function () {
            Route::post('/facilities', [FacilityController::class, 'store']);
            Route::put('/facilities/{facility}', [FacilityController::class, 'update']);
            Route::delete('/facilities/{facility}', [FacilityController::class, 'destroy']);
        });

        Route::middleware('permission:cities.view')->group(function () {
            Route::get('/cities', [AdminCityController::class, 'index']);
            Route::get('/cities/{id}', [AdminCityController::class, 'show']);
        });

        Route::middleware('permission:cities.manage')->group(function () {
            Route::post('/cities', [AdminCityController::class, 'store']);
            Route::put('/cities/{id}', [AdminCityController::class, 'update']);
            Route::patch('/cities/{id}/toggle-active', [AdminCityController::class, 'toggleActive']);
            Route::delete('/cities/{id}', [AdminCityController::class, 'destroy']);
        });

        Route::middleware('permission:plans.view')->group(function () {
            Route::get('/plans', [PlanController::class, 'index']);
            Route::get('/plans/{plan}', [PlanController::class, 'show']);
        });

        Route::middleware('permission:plans.manage')->group(function () {
            Route::post('/plans', [PlanController::class, 'store']);
            Route::put('/plans/{plan}', [PlanController::class, 'update']);
            Route::patch('/plans/{plan}/status', [PlanController::class, 'updateStatus']);
            Route::put('/plans/{plan}/features', [PlanController::class, 'syncFeatures']);
            Route::put('/plans/{plan}/discount', [PlanController::class, 'updateDiscount']);
            Route::post('/plans/reorder', [PlanController::class, 'reorder']);
            Route::delete('/plans/{plan}', [PlanController::class, 'destroy']);

            Route::get('/users/{id}/subscription', [UserSubscriptionController::class, 'show']);
            Route::put('/users/{id}/subscription', [UserSubscriptionController::class, 'update']);
            Route::delete('/users/{id}/subscription', [UserSubscriptionController::class, 'destroy']);
        });
    });

    Route::middleware(['committee.approved', 'module.maintenance:tournaments'])->prefix('committee')->group(function () {
        Route::get('/teams', [CommitteeTeamController::class, 'index']);
        Route::get('/tournaments', [TournamentController::class, 'index']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/tournaments', [TournamentController::class, 'store']);
        });

        Route::get('/referees', [CommitteeRefereeController::class, 'index']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/referees', [CommitteeRefereeController::class, 'store']);
        });

        Route::get('/teams/{team}/players', [CommitteeTeamPlayerController::class, 'index']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/teams/{team}/players', [CommitteeTeamPlayerController::class, 'store']);
        });

        Route::scopeBindings()->prefix('tournaments/{tournament}')->group(function () {
            Route::get('/', [TournamentController::class, 'show']);
            Route::get('/progress', [TournamentController::class, 'progress']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::put('/', [TournamentController::class, 'update']);
                Route::delete('/', [TournamentController::class, 'destroy']);
                Route::post('/open-registration', [TournamentController::class, 'openRegistration']);
                Route::post('/close-registration', [TournamentController::class, 'closeRegistration']);
                Route::post('/start', [TournamentController::class, 'startTournament']);
                Route::post('/cancel', [TournamentController::class, 'cancel']);
                Route::post('/branding', [TournamentBrandingController::class, 'update']);
            });

            Route::get('/registrations', [TournamentTeamController::class, 'registrations']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/teams/{teamId}/approve', [TournamentTeamController::class, 'approve']);
                Route::post('/teams/{teamId}/reject', [TournamentTeamController::class, 'reject']);
                Route::post('/teams/{teamId}/payment', [TournamentTeamController::class, 'markPaid']);
                Route::post('/teams/{teamId}/payment/unmark', [TournamentTeamController::class, 'unmarkPaid']);
            });

            Route::get('/teams', [TournamentTeamController::class, 'index']);
            Route::get('/teams/{team}/squad', [TournamentSquadController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/teams', [TournamentTeamController::class, 'store']);
                Route::post('/teams/free', [TournamentTeamController::class, 'storeFree']);
                Route::post('/teams/free/bulk', [TournamentTeamController::class, 'storeBulkFree']);
                Route::put('/teams/group', [TournamentTeamController::class, 'assignGroup']);
                Route::delete('/teams/{teamId}', [TournamentTeamController::class, 'destroy']);
                Route::put('/teams/{team}/squad/{playerId}', [TournamentSquadController::class, 'toggle']);
                Route::post('/teams/{team}/squad', [TournamentSquadController::class, 'store']);
            });

            Route::get('/stadiums', [TournamentStadiumController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::put('/stadiums', [TournamentStadiumController::class, 'store']);
            });

            Route::get('/draw', [TournamentDrawController::class, 'show']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/draw', [TournamentDrawController::class, 'store']);
                Route::put('/draw/team', [TournamentDrawController::class, 'assign']);
                Route::put('/draw/teams', [TournamentDrawController::class, 'save']);
                Route::delete('/draw', [TournamentDrawController::class, 'destroy']);
                Route::post('/draw/confirm', [TournamentDrawController::class, 'confirm']);
                Route::delete('/draw/confirm', [TournamentDrawController::class, 'unconfirm']);
            });

            Route::get('/fixtures', [TournamentFixtureController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/fixtures', [TournamentFixtureController::class, 'store']);
                Route::post('/fixtures/preview', [TournamentFixtureController::class, 'preview']);
                Route::delete('/fixtures', [TournamentFixtureController::class, 'destroy']);
                Route::put('/fixtures/{fixture}', [TournamentFixtureController::class, 'reschedule']);
                Route::post('/fixtures/{fixture}/postpone', [TournamentFixtureController::class, 'postpone']);
                Route::post('/fixtures/{fixture}/cancel', [TournamentFixtureController::class, 'cancel']);
                Route::post('/fixtures/{fixture}/restore', [TournamentFixtureController::class, 'restore']);
            });

            Route::get('/fixtures/terrains', [TournamentFixtureController::class, 'terrains']);
            Route::get('/fixtures/knockout-qualified', [TournamentFixtureController::class, 'knockoutQualified']);
            Route::get('/match-rounds', [TournamentFixtureController::class, 'matchRounds']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/fixtures/{fixture}/result', [TournamentResultController::class, 'store']);
                Route::put('/fixtures/{fixture}/result', [TournamentResultController::class, 'update']);
                Route::delete('/fixtures/{fixture}/result', [TournamentResultController::class, 'destroy']);
            });

            Route::get('/fixtures/{fixture}/result', [TournamentResultController::class, 'show']);

            Route::get('/fixtures/{fixture}/events', [TournamentMatchEventController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/fixtures/{fixture}/events', [TournamentMatchEventController::class, 'store']);
                Route::put('/fixtures/{fixture}/events/{event}', [TournamentMatchEventController::class, 'update']);
                Route::delete('/fixtures/{fixture}/events/{event}', [TournamentMatchEventController::class, 'destroy']);
            });

            Route::get('/standings', [TournamentStandingController::class, 'index']);

            Route::get('/bracket', [TournamentBracketController::class, 'index']);
            Route::get('/bracket/validation', [TournamentBracketController::class, 'validation']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/bracket', [TournamentBracketController::class, 'store']);
                Route::post('/bracket/populate', [TournamentBracketController::class, 'populate']);
                Route::post('/bracket/sync', [TournamentBracketController::class, 'sync']);
            });

            Route::get('/statistics', [TournamentStatisticsController::class, 'index']);

            Route::get('/news', [TournamentNewsController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::post('/news', [TournamentNewsController::class, 'store']);
                Route::put('/news/{news}', [TournamentNewsController::class, 'update']);
                Route::delete('/news/{news}', [TournamentNewsController::class, 'destroy']);
            });

            Route::get('/gallery', [TournamentGalleryController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::post('/gallery', [TournamentGalleryController::class, 'store']);
                Route::put('/gallery/{image}', [TournamentGalleryController::class, 'update']);
                Route::delete('/gallery/{image}', [TournamentGalleryController::class, 'destroy']);
            });

            Route::get('/sponsors', [TournamentSponsorController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::post('/sponsors', [TournamentSponsorController::class, 'store']);
                Route::put('/sponsors/{sponsor}', [TournamentSponsorController::class, 'update']);
                Route::delete('/sponsors/{sponsor}', [TournamentSponsorController::class, 'destroy']);
            });

            Route::get('/partners', [TournamentPartnerController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::post('/partners', [TournamentPartnerController::class, 'store']);
                Route::put('/partners/{partner}', [TournamentPartnerController::class, 'update']);
                Route::delete('/partners/{partner}', [TournamentPartnerController::class, 'destroy']);
            });

            Route::get('/contact', [TournamentContactController::class, 'showContact']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::put('/contact', [TournamentContactController::class, 'updateContact']);
            });

            Route::get('/messages', [TournamentContactController::class, 'messages']);
            Route::get('/messages/{message}', [TournamentContactController::class, 'showMessage']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::put('/messages/{message}', [TournamentContactController::class, 'updateMessageStatus']);
                Route::delete('/messages/{message}', [TournamentContactController::class, 'destroyMessage']);
            });
        });
    });

    Route::middleware('manager.approved')->group(function () {
        Route::middleware('module.maintenance:matches')->group(function () {
            Route::get('/manager/my-match-requests', [MatchRequestController::class, 'index']);
            Route::get('/manager/received-challenges', [MatchRequestController::class, 'receivedChallenges']);

            Route::middleware(['activity.not_locked', 'throttle:match'])->group(function () {
                Route::post('/manager/match-requests', [MatchRequestController::class, 'store']);
                Route::post('/manager/challenges', [MatchRequestController::class, 'sendChallenge']);
                Route::put('/manager/challenges/{id}/respond', [MatchRequestController::class, 'respondToChallenge']);
                Route::delete('/manager/match-requests/{id}', [MatchRequestController::class, 'destroy']);
            });

            Route::get('/manager/match-feed', [MatchFeedController::class, 'index']);

            Route::middleware(['activity.not_locked', 'throttle:match'])->group(function () {
                Route::post('/manager/match-requests/{id}/accept', [MatchFeedController::class, 'accept']);
                Route::post('/manager/match-requests/{id}/start', [MatchRequestController::class, 'start']);
            });

            Route::get('/manager/matches/pending-scores', [MatchResultController::class, 'pendingScores']);
            Route::get('/manager/matches/pending-confirmations', [MatchResultController::class, 'pendingConfirmations']);

            Route::middleware(['activity.not_locked', 'throttle:match'])->group(function () {
                Route::post('/manager/matches/{id}/submit-score', [MatchResultController::class, 'submitScore']);
                Route::post('/manager/matches/{id}/confirm-score', [MatchResultController::class, 'confirmScore']);
                Route::post('/manager/matches/{id}/dispute-score', [MatchResultController::class, 'disputeScore']);
            });

            Route::get('/manager/matches/{matchId}/applicants', [PlayerRecruitController::class, 'applicants']);

            Route::get('/manager/match-requests/{matchRequestId}/lineup', [ManagerLineupController::class, 'index']);
            Route::get('/manager/match-requests/{matchRequestId}/lineup/roster', [ManagerLineupController::class, 'roster']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::put('/manager/match-requests/{matchRequestId}/lineup', [ManagerLineupController::class, 'update']);
                Route::put('/manager/match-requests/{matchRequestId}/lineup/captain', [ManagerLineupController::class, 'setCaptain']);
                Route::put('/manager/match-requests/{matchRequestId}/lineup/vice-captain', [ManagerLineupController::class, 'setViceCaptain']);
                Route::put('/manager/match-requests/{matchRequestId}/lineup/free-kick', [ManagerLineupController::class, 'setFreeKickTaker']);
            });
        });

        Route::middleware('module.maintenance:teams')->group(function () {
            Route::get('/manager/team-profile', [TeamProfileController::class, 'show']);

            Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
                Route::put('/manager/team-profile', [TeamProfileController::class, 'update']);
                Route::post('/manager/team-profile/logo', [TeamProfileController::class, 'uploadLogo']);
            });

            Route::get('/manager/teams/{id}', [PublicTeamController::class, 'show']);
        });

        Route::middleware('module.maintenance:players')->group(function () {
            Route::get('/manager/players', [PlayerController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/manager/players', [PlayerController::class, 'store']);
                Route::put('/manager/players/{id}', [PlayerController::class, 'update']);
                Route::delete('/manager/players/{id}', [PlayerController::class, 'destroy']);
            });

            // Team membership management
            Route::get('/manager/team-members', [TeamMembershipController::class, 'index']);
            Route::get('/manager/team-members/essential', [TeamMembershipController::class, 'essential']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/manager/team-members', [TeamMembershipController::class, 'addMember']);
                Route::delete('/manager/team-members/{id}', [TeamMembershipController::class, 'removeMember']);
                Route::put('/manager/team-members/{id}/essential', [TeamMembershipController::class, 'toggleEssential']);
                Route::put('/manager/team-members/{id}/position', [TeamMembershipController::class, 'changePosition']);
            });
        });

        Route::middleware(['auth:sanctum', 'user.approved', 'module.maintenance:bookings', 'throttle:booking'])->prefix('manager')->group(function () {
            Route::get('/bookings', [BookingController::class, 'getManagerBookings']);
            Route::get('/terrains/{terrainId}/my-reservations', [BookingController::class, 'myReservations']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/bookings/{bookingId}/request-cancel', [BookingController::class, 'requestCancel']);
                Route::post('/match-requests/from-booking/{bookingId}', [MatchRequestController::class, 'createFromBooking']);
                Route::post('/bookings/training', [BookingController::class, 'createTrainingBooking']);
                Route::post('/direct-bookings', [DirectBookingController::class, 'store']);
            });
        });

        Route::middleware('module.maintenance:recruitment')->group(function () {
            Route::get('/manager/recruitment/search', [PlayerRecruitController::class, 'search']);

        Route::middleware(['activity.not_locked', 'throttle:team-request'])->group(function () {
            Route::post('/manager/recruitment/{playerId}/invite', [PlayerRecruitController::class, 'invite']);
            Route::put('/manager/recruitment/applications/{applicationId}/respond', [PlayerRecruitController::class, 'respond']);
        });
        });

        Route::middleware('module.maintenance:tournaments')->group(function () {
            Route::get('/manager/tournaments', [ManagerTournamentController::class, 'index']);

            Route::middleware('activity.not_locked')->group(function () {
                Route::post('/manager/tournaments/{tournament}/register', [ManagerTournamentController::class, 'register']);
                Route::delete('/manager/tournaments/{tournament}/register', [ManagerTournamentController::class, 'cancel']);
                Route::put('/manager/tournaments/{tournament}/squad/{playerId}', [ManagerTournamentSquadController::class, 'toggle']);
            });

            Route::get('/manager/tournaments/{tournament}/squad', [ManagerTournamentSquadController::class, 'index']);
        });
    });

    Route::middleware(['player.approved', 'module.maintenance:players'])->prefix('player')->group(function () {
        Route::get('/profile', [PlayerProfileController::class, 'profile']);
        Route::get('/match-feed', [PlayerProfileController::class, 'matchFeed']);
        Route::get('/matches/{matchId}', [PlayerProfileController::class, 'matchDetail']);
        Route::get('/applications', [PlayerProfileController::class, 'applications']);
        Route::get('/matches', [PlayerProfileController::class, 'matches']);
        Route::get('/stats', [PlayerProfileController::class, 'stats']);
        Route::get('/overview', [PlayerProfileController::class, 'overview']);
        Route::get('/my-team', [TeamMembershipController::class, 'myTeam']);

        Route::middleware(['activity.not_locked', 'throttle:team-request'])->group(function () {
            Route::put('/profile', [PlayerProfileController::class, 'updateProfile']);
            Route::post('/profile/photo', [PlayerProfileController::class, 'uploadPhoto'])->middleware('throttle:upload');
            Route::post('/matches/{matchId}/apply', [PlayerProfileController::class, 'apply']);
            Route::put('/applications/{applicationId}/respond', [PlayerProfileController::class, 'respond']);
            Route::put('/applications/{applicationId}/cancel', [PlayerProfileController::class, 'cancel']);
            Route::post('/team-requests', [PlayerProfileController::class, 'storeTeamRequest']);
            Route::get('/team-requests', [PlayerProfileController::class, 'teamRequests']);
            Route::put('/team-requests/{id}/cancel', [PlayerProfileController::class, 'cancelTeamRequest']);
        });
    });

    Route::middleware(['terrain.owner', 'module.maintenance:terrain'])->prefix('owner')->group(function () {
        Route::get('/terrains', [TerrainOwnerController::class, 'index']);
        Route::get('/terrains/{id}', [TerrainOwnerController::class, 'show']);

        Route::middleware(['activity.not_locked', 'throttle:upload'])->group(function () {
            Route::post('/terrains', [TerrainOwnerController::class, 'store']);
            Route::put('/terrains/{id}', [TerrainOwnerController::class, 'update']);
            Route::delete('/terrains/{id}', [TerrainOwnerController::class, 'destroy']);
            Route::post('/terrains/{id}/images', [TerrainOwnerController::class, 'uploadImages']);
            Route::delete('/terrains/{terrainId}/images/{imageId}', [TerrainOwnerController::class, 'destroyImage']);
            Route::put('/terrains/{id}/cover', [TerrainOwnerController::class, 'setCover']);
        });

        Route::get('/stats', [TerrainOwnerController::class, 'stats']);
        Route::get('/overview', [TerrainOwnerController::class, 'overview']);
        Route::get('/analytics/overview', [TerrainOwnerController::class, 'overviewAnalytics']);
        Route::get('/analytics/details', [TerrainOwnerController::class, 'analyticsDetails']);
        Route::get('/bookings', [TerrainOwnerController::class, 'upcomingBookings']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::put('/terrains/{id}/toggle-status', [OwnerTerrainController::class, 'toggleStatus']);
            Route::put('/terrains/{id}/working-hours', [OwnerTerrainController::class, 'updateWorkingHours']);
        });

        Route::get('/terrains/{terrainId}/calendar', [BookingController::class, 'getOwnerCalendar']);

        Route::middleware(['activity.not_locked', 'throttle:booking-manage'])->group(function () {
            Route::put('/bookings/{bookingId}/status', [BookingController::class, 'ownerManageBooking']);
            Route::post('/terrains/{terrainId}/guest-bookings', [BookingController::class, 'ownerCreateGuestBooking']);
            Route::put('/bookings/{id}/approve', [OwnerBookingController::class, 'approve']);
            Route::put('/bookings/{id}/reject', [OwnerBookingController::class, 'reject']);
            Route::put('/cancellation-requests/{cancellationId}', [OwnerBookingController::class, 'handleCancellation']);
        });

        Route::get('/cancellation-requests', [OwnerBookingController::class, 'cancellationRequests']);

        Route::get('/terrains/{terrainId}/slot-closures', [SlotClosureController::class, 'index']);

        Route::middleware('activity.not_locked')->group(function () {
            Route::post('/terrains/{terrainId}/slot-closures', [SlotClosureController::class, 'store']);
            Route::delete('/terrains/{terrainId}/slot-closures/{closureId}', [SlotClosureController::class, 'destroy']);
        });
    });
});
