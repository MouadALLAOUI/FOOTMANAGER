<?php

namespace App\Domains\Shared\Support;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class CurrentTeamResolver
{
    /**
     * Resolves the requested team ID from the current HTTP request if available.
     */
    protected function requestedTeamId(): ?int
    {
        if (! request()) {
            return null;
        }

        $headerId = request()->header('X-Team-ID');
        if ($headerId && is_numeric($headerId)) {
            return (int) $headerId;
        }

        $queryId = request()->query('team_id') ?? request()->input('team_id');
        if ($queryId && is_numeric($queryId)) {
            return (int) $queryId;
        }

        return null;
    }

    public function for(User $user): Team
    {
        if ($user->isManager()) {
            $requestedId = $this->requestedTeamId();

            if ($requestedId) {
                $team = Team::with(['primaryStadium', 'captain', 'viceCaptain', 'manager'])
                    ->where('id', $requestedId)
                    ->where('manager_id', $user->id)
                    ->first();

                if (! $team) {
                    throw new AuthorizationException('غير مصرح لك بالوصول إلى هذا الفريق');
                }

                return $team;
            }

            if ($user->current_team_id) {
                $team = Team::with(['primaryStadium', 'captain', 'viceCaptain', 'manager'])
                    ->where('id', $user->current_team_id)
                    ->where('manager_id', $user->id)
                    ->first();

                if ($team) {
                    return $team;
                }
            }

            return Team::with(['primaryStadium', 'captain', 'viceCaptain', 'manager'])
                ->where('manager_id', $user->id)
                ->orderBy('id', 'asc')
                ->first()
                ?? throw new ModelNotFoundException('لا يوجد فريق مرتبط بحسابك');
        }

        $player = $user->rosterPlayer;

        if ($player) {
            return $player->team()->with(['primaryStadium', 'captain', 'viceCaptain', 'manager'])->first()
                ?? throw new ModelNotFoundException('لا يوجد فريق مرتبط بحسابك');
        }

        throw new ModelNotFoundException('لا يوجد فريق مرتبط بحسابك');
    }

    public function teamIdFor(User $user): ?int
    {
        if ($user->isManager()) {
            $requestedId = $this->requestedTeamId();

            if ($requestedId) {
                $isOwner = Team::where('id', $requestedId)
                    ->where('manager_id', $user->id)
                    ->exists();

                if (! $isOwner) {
                    throw new AuthorizationException('غير مصرح لك بالوصول إلى هذا الفريق');
                }

                return $requestedId;
            }

            if ($user->current_team_id) {
                $isOwner = Team::where('id', $user->current_team_id)
                    ->where('manager_id', $user->id)
                    ->exists();

                if ($isOwner) {
                    return (int) $user->current_team_id;
                }
            }

            return Team::where('manager_id', $user->id)
                ->orderBy('id', 'asc')
                ->value('id');
        }

        return $user->rosterPlayer?->team_id;
    }

    public function teamIdForPlayerId(int $playerId): ?int
    {
        return Player::whereKey($playerId)->value('team_id');
    }
}
