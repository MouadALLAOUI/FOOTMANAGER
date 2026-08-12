<?php

namespace App\Domains\Shared\Support;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class CurrentTeamResolver
{
    public function for(User $user): Team
    {
        if ($user->isManager()) {
            return $user->team()->with(['primaryStadium', 'captain', 'viceCaptain', 'manager'])->first()
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
            return $user->team?->id;
        }

        return $user->rosterPlayer?->team_id;
    }

    public function teamIdForPlayerId(int $playerId): ?int
    {
        return Player::whereKey($playerId)->value('team_id');
    }
}
