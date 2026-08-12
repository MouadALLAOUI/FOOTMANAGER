<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\CaptainAssigned;
use App\Domains\Team\Models\Team;
use Illuminate\Validation\ValidationException;

class CaptainService
{
    public function assignCaptain(Team $team, Player $player): Team
    {
        $this->assertBelongsToTeam($team, $player);

        $team->update([
            'captain_id' => $player->id,
            'vice_captain_id' => $team->vice_captain_id === $player->id ? null : $team->vice_captain_id,
        ]);

        $this->syncFormation($team);

        TeamCache::flushTeam($team->id);

        event(new CaptainAssigned($team, $player));

        return $this->reload($team);
    }

    public function assignViceCaptain(Team $team, Player $player): Team
    {
        $this->assertBelongsToTeam($team, $player);

        $team->update([
            'vice_captain_id' => $player->id,
            'captain_id' => $team->captain_id === $player->id ? null : $team->captain_id,
        ]);

        $this->syncFormation($team);

        TeamCache::flushTeam($team->id);

        event(new CaptainAssigned($team, $player, true));

        return $this->reload($team);
    }

    public function removeCaptain(Team $team): Team
    {
        $team->update(['captain_id' => null]);
        TeamCache::flushTeam($team->id);

        return $this->reload($team);
    }

    public function removeViceCaptain(Team $team): Team
    {
        $team->update(['vice_captain_id' => null]);
        TeamCache::flushTeam($team->id);

        return $this->reload($team);
    }

    private function assertBelongsToTeam(Team $team, Player $player): void
    {
        if ((int) $player->team_id !== (int) $team->id) {
            throw ValidationException::withMessages([
                'player' => 'اللاعب غير موجود في هذا الفريق',
            ]);
        }
    }

    private function syncFormation(Team $team): void
    {
        $formation = $team->formation()->first();

        if ($formation) {
            $formation->update([
                'captain_id' => $team->captain_id,
                'vice_captain_id' => $team->vice_captain_id,
            ]);
        }
    }

    private function reload(Team $team): Team
    {
        return $team->fresh(['primaryStadium', 'captain', 'viceCaptain', 'manager:id,name,phone,status,is_whatsapp']);
    }
}
