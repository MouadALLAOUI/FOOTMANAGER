<?php

namespace App\Domains\Team\Services;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Social\Models\Favorite;
use App\Domains\Social\Models\Follow;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;

class TeamPageService
{
    public function page(Team $team, ?User $viewer = null): array
    {
        if (! $team->isPublic() && ! $this->canViewPrivate($team, $viewer)) {
            throw new DomainException('هذا الفريق خاص.', 403);
        }

        return [
            'team' => $team->load('manager:id,name', 'primaryStadium:id,name,city', 'captain:id,name,number,position'),
            'stats' => $this->stats($team),
            'squad' => $this->squad($team),
            'upcoming_matches' => $this->upcomingMatches($team),
            'recent_matches' => $this->recentMatches($team),
            'announcements' => $team->announcements()->limit(3)->get(),
            'gallery' => $team->galleryImages()->limit(6)->get(),
            'is_following' => $viewer ? $this->isFollowing($team, $viewer) : false,
            'is_favorite' => $viewer ? $this->isFavorite($team, $viewer) : false,
        ];
    }

    public function stats(Team $team): array
    {
        return [
            'points' => $team->points,
            'matches_played' => $team->matches_played,
            'wins' => $team->wins,
            'draws' => $team->draws,
            'losses' => $team->losses,
            'goals_for' => $team->goals_for,
            'goals_against' => $team->goals_against,
            'goal_difference' => $team->goal_difference,
            'followers_count' => Follow::query()
                ->where('followable_type', $team->getMorphClass())
                ->where('followable_id', $team->id)
                ->count(),
        ];
    }

    public function squad(Team $team): Collection
    {
        return Player::query()
            ->where('team_id', $team->id)
            ->where('status', Player::STATUS_ACTIVE)
            ->orderByRaw("FIELD(role, 'starter', 'substitute', 'reserve')")
            ->orderBy('number')
            ->get(['id', 'name', 'position', 'number', 'role', 'preferred_foot', 'user_id']);
    }

    public function upcomingMatches(Team $team): Collection
    {
        return FootballMatch::query()
            ->forTeam($team->id)
            ->where('status', MatchStatus::Scheduled->value)
            ->where('started_at', '>', now())
            ->with('homeTeam:id,name,logo_path', 'awayTeam:id,name,logo_path', 'stadium:id,name,city')
            ->orderBy('started_at')
            ->limit(5)
            ->get();
    }

    public function recentMatches(Team $team): Collection
    {
        return FootballMatch::query()
            ->forTeam($team->id)
            ->where('status', MatchStatus::Finished->value)
            ->with('homeTeam:id,name,logo_path', 'awayTeam:id,name,logo_path')
            ->orderByDesc('ended_at')
            ->limit(10)
            ->get();
    }

    public function canViewPrivate(Team $team, ?User $viewer): bool
    {
        if (! $viewer) {
            return false;
        }

        if ($viewer->isAdmin() || (int) $team->manager_id === (int) $viewer->id) {
            return true;
        }

        return Player::query()
            ->where('team_id', $team->id)
            ->where('user_id', $viewer->id)
            ->exists();
    }

    public function isFollowing(Team $team, User $viewer): bool
    {
        return Follow::query()
            ->where('followable_type', $team->getMorphClass())
            ->where('followable_id', $team->id)
            ->where('follower_id', $viewer->id)
            ->exists();
    }

    public function isFavorite(Team $team, User $viewer): bool
    {
        return Favorite::query()
            ->where('favoritable_type', $team->getMorphClass())
            ->where('favoritable_id', $team->id)
            ->where('user_id', $viewer->id)
            ->exists();
    }
}
