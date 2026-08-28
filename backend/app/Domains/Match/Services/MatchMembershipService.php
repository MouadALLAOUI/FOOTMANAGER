<?php

namespace App\Domains\Match\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;
use App\Domains\Match\Services\PlayerMatchGuard;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Support\Carbon;

class MatchMembershipService
{
    public function userParticipates(User $user, FootballMatch $match): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $teamIds = array_values(array_filter([
            (int) $match->home_team_id,
            (int) $match->away_team_id,
        ]));

        if (empty($teamIds)) {
            return false;
        }

        if ($this->managesTeam($user, $teamIds)) {
            return true;
        }

        if ($this->playsForTeam($user, $teamIds)) {
            return true;
        }

        return $this->isAcceptedApplicant($user, $match);
    }

    private function managesTeam(User $user, array $teamIds): bool
    {
        return Team::query()
            ->whereIn('id', $teamIds)
            ->where('manager_id', $user->id)
            ->exists();
    }

    private function playsForTeam(User $user, array $teamIds): bool
    {
        return Player::query()
            ->where('user_id', $user->id)
            ->whereIn('team_id', $teamIds)
            ->exists();
    }

    private function isAcceptedApplicant(User $user, FootballMatch $match): bool
    {
        $matchRequestId = $match->match_request_id;

        if ($matchRequestId === null) {
            return false;
        }

        $accepted = PlayerMatchRequest::query()
            ->where('match_request_id', $matchRequestId)
            ->where('player_id', $user->id)
            ->where('status', 'accepted')
            ->exists();

        if ($accepted) {
            return true;
        }

        $matchRequest = $match->matchRequest;

        return $matchRequest !== null && (int) $matchRequest->mercenary_player_id === (int) $user->id;
    }

    /**
     * Every user entitled to see / take part in a match — team managers,
     * team players, accepted applicants and the mercenary player.
     */
    public function participantUserIds(FootballMatch $match): array
    {
        $teamIds = array_values(array_filter([
            (int) $match->home_team_id,
            (int) $match->away_team_id,
        ]));

        $userIds = [];

        if ($teamIds !== []) {
            $userIds[] = Team::query()->whereIn('id', $teamIds)->pluck('manager_id')->all();
            $userIds[] = Player::query()->whereIn('team_id', $teamIds)->pluck('user_id')->all();
        }

        if ($match->match_request_id !== null) {
            $userIds[] = PlayerMatchRequest::query()
                ->where('match_request_id', $match->match_request_id)
                ->where('status', 'accepted')
                ->pluck('player_id')
                ->all();

            $mercenaryPlayerId = $match->matchRequest?->mercenary_player_id;

            if ($mercenaryPlayerId) {
                $userIds[] = [$mercenaryPlayerId];
            }
        }

        return collect($userIds)
            ->flatten()
            ->map(fn ($id): int => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public static function teamHasMatchConflict(int $teamId, Carbon $datetime, ?int $excludeMatchId = null): bool
    {
        $window = PlayerMatchGuard::MATCH_WINDOW_HOURS;
        $start = $datetime->copy()->subHours($window);
        $end = $datetime->copy()->addHours($window);

        $amical = MatchRequest::query()
            ->where('id', '!=', $excludeMatchId)
            ->whereIn('status', ['accepted', 'live'])
            ->where(function ($q) use ($teamId) {
                $q->where('host_team_id', $teamId)
                    ->orWhere('target_team_id', $teamId)
                    ->orWhere('opponent_team_id', $teamId);
            })
            ->where('match_datetime', '>', $start)
            ->where('match_datetime', '<', $end)
            ->exists();

        if ($amical) {
            return true;
        }

        // Tournament fixtures carry their schedule on the fixtures table
        // (matches.scheduled_at does not exist), so tournament conflicts are
        // detected against fixtures, ignoring played/cancelled matches.
        return Fixture::query()
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)
                    ->orWhere('away_team_id', $teamId);
            })
            ->where('scheduled_at', '>', $start)
            ->where('scheduled_at', '<', $end)
            ->whereNotIn('status', [FixtureStatus::Postponed->value, FixtureStatus::Cancelled->value])
            ->whereDoesntHave('match', fn ($q) => $q->whereIn('status', [MatchStatus::Finished->value, MatchStatus::Cancelled->value]))
            ->exists();
    }

    public static function teamHasPlayerConflict(int $teamId, Carbon $datetime, ?int $excludeMatchId = null): bool
    {
        $playerIds = Player::where('team_id', $teamId)->pluck('user_id');

        if ($playerIds->isEmpty()) {
            return false;
        }

        $window = PlayerMatchGuard::MATCH_WINDOW_HOURS;
        $start = $datetime->copy()->subHours($window);
        $end = $datetime->copy()->addHours($window);

        return PlayerMatchRequest::query()
            ->whereIn('player_id', $playerIds)
            ->where('status', 'accepted')
            ->where('match_request_id', '!=', $excludeMatchId)
            ->whereHas('matchRequest', function ($q) use ($start, $end) {
                $q->where('status', '!=', 'cancelled')
                    ->where('match_datetime', '>', $start)
                    ->where('match_datetime', '<', $end);
            })
            ->exists();
    }

    public static function stadiumHasFixtureConflict(int $stadiumId, Carbon $datetime): bool
    {
        $window = PlayerMatchGuard::MATCH_WINDOW_HOURS;
        $start = $datetime->copy()->subHours($window);
        $end = $datetime->copy()->addHours($window);

        return Fixture::query()
            ->where('stadium_id', $stadiumId)
            ->whereNotIn('status', [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value])
            ->where('scheduled_at', '>', $start)
            ->where('scheduled_at', '<', $end)
            ->exists();
    }
}
