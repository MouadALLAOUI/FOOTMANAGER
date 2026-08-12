<?php

namespace App\Providers;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Policies\TerrainBookingPolicy;
use App\Domains\Chat\Policies\MatchChatPolicy;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Observers\MatchRequestObserver;
use App\Domains\Match\Policies\MatchPolicy;
use App\Domains\Player\Models\Player;
use App\Domains\Player\Models\PlayerAvailabilitySlot;
use App\Domains\Player\Models\PlayerGalleryImage;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Player\Models\PlayerTeamHistory;
use App\Domains\Player\Models\PlayerTransfer;
use App\Domains\Player\Policies\PlayerAvailabilitySlotPolicy;
use App\Domains\Player\Policies\PlayerGalleryImagePolicy;
use App\Domains\Player\Policies\PlayerProfilePolicy;
use App\Domains\Player\Policies\PlayerTeamHistoryPolicy;
use App\Domains\Player\Policies\PlayerTransferPolicy;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Review\Policies\PlayerReviewPolicy;
use App\Domains\Review\Policies\StadiumReviewPolicy;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Models\Comment;
use App\Domains\Social\Models\Reaction;
use App\Domains\Social\Models\Report;
use App\Domains\Social\Observers\FootballMatchObserver;
use App\Domains\Social\Observers\PlayerObserver;
use App\Domains\Social\Observers\StadiumObserver;
use App\Domains\Social\Observers\TeamObserver;
use App\Domains\Social\Policies\CommentPolicy;
use App\Domains\Social\Policies\ReactionPolicy;
use App\Domains\Social\Policies\ReportPolicy;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamAnnouncement;
use App\Domains\Team\Policies\TeamAnnouncementPolicy;
use App\Domains\Team\Policies\TeamPolicy;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Policies\TournamentPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);

        MorphMap::register();

        MatchRequest::observe(MatchRequestObserver::class);
        Team::observe(TeamObserver::class);
        Player::observe(PlayerObserver::class);
        Stadium::observe(StadiumObserver::class);
        FootballMatch::observe(FootballMatchObserver::class);

        Gate::policy(Team::class, TeamPolicy::class);
        Gate::policy(TeamAnnouncement::class, TeamAnnouncementPolicy::class);
        Gate::policy(PlayerAvailabilitySlot::class, PlayerAvailabilitySlotPolicy::class);
        Gate::policy(PlayerGalleryImage::class, PlayerGalleryImagePolicy::class);
        Gate::policy(PlayerProfile::class, PlayerProfilePolicy::class);
        Gate::policy(PlayerTeamHistory::class, PlayerTeamHistoryPolicy::class);
        Gate::policy(PlayerTransfer::class, PlayerTransferPolicy::class);
        Gate::policy(TerrainBooking::class, TerrainBookingPolicy::class);
        Gate::policy(FootballMatch::class, MatchPolicy::class);
        Gate::policy(Tournament::class, TournamentPolicy::class);

        Gate::policy(Comment::class, CommentPolicy::class);
        Gate::policy(Reaction::class, ReactionPolicy::class);
        Gate::policy(Report::class, ReportPolicy::class);
        Gate::policy(PlayerReview::class, PlayerReviewPolicy::class);
        Gate::policy(StadiumReview::class, StadiumReviewPolicy::class);

        Gate::policy(Player::class, PlayerReviewPolicy::class);
        Gate::policy(Stadium::class, StadiumReviewPolicy::class);

        Gate::define('chat.view', fn ($user, $match) => app(MatchChatPolicy::class)->view($user, $match));
        Gate::define('chat.send', fn ($user, $match) => app(MatchChatPolicy::class)->send($user, $match));
        Gate::define('chat.mute', fn ($user, $match) => app(MatchChatPolicy::class)->mute($user, $match));
        Gate::define('chat.pin', fn ($user, $match) => app(MatchChatPolicy::class)->pin($user, $match));
        Gate::define('chat.update', fn ($user, $message) => app(MatchChatPolicy::class)->update($user, $message));
        Gate::define('chat.delete', fn ($user, $message) => app(MatchChatPolicy::class)->delete($user, $message));
    }
}
