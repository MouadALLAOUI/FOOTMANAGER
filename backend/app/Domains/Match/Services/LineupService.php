<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchLineup;
use App\Domains\Shared\Exceptions\DomainException;

class LineupService
{
    public function setStarter(FootballMatch $match, int $teamId, int $playerId, ?string $position = null, ?int $shirtNumber = null, int $orderIndex = 0): MatchLineup
    {
        $this->assertTeamInMatch($match, $teamId);

        return MatchLineup::query()->updateOrCreate(
            ['match_id' => $match->id, 'team_id' => $teamId, 'player_id' => $playerId],
            [
                'position' => $position,
                'shirt_number' => $shirtNumber,
                'is_starter' => true,
                'order_index' => $orderIndex,
            ],
        );
    }

    public function addToBench(FootballMatch $match, int $teamId, int $playerId, ?string $position = null, ?int $shirtNumber = null): MatchLineup
    {
        $this->assertTeamInMatch($match, $teamId);

        return MatchLineup::query()->updateOrCreate(
            ['match_id' => $match->id, 'team_id' => $teamId, 'player_id' => $playerId],
            [
                'position' => $position,
                'shirt_number' => $shirtNumber,
                'is_starter' => false,
                'order_index' => 0,
            ],
        );
    }

    public function setCaptain(FootballMatch $match, int $teamId, int $playerId): MatchLineup
    {
        $entry = $this->entryFor($match, $teamId, $playerId);

        MatchLineup::query()
            ->where('match_id', $match->id)
            ->where('team_id', $teamId)
            ->where('id', '!=', $entry->id)
            ->update(['is_captain' => false, 'is_vice_captain' => false]);

        $entry->is_captain = true;
        $entry->is_vice_captain = false;
        $entry->save();

        return $entry;
    }

    public function setViceCaptain(FootballMatch $match, int $teamId, int $playerId): MatchLineup
    {
        $entry = $this->entryFor($match, $teamId, $playerId);

        $entry->is_captain = false;
        $entry->is_vice_captain = true;
        $entry->save();

        return $entry;
    }

    public function substitute(FootballMatch $match, int $teamId, int $outPlayerId, int $inPlayerId): MatchLineup
    {
        $out = $this->entryFor($match, $teamId, $outPlayerId);
        $in = $this->entryFor($match, $teamId, $inPlayerId);

        $in->update([
            'position' => $out->position,
            'shirt_number' => $out->shirt_number,
            'is_starter' => $out->is_starter,
            'is_captain' => $out->is_captain,
            'is_vice_captain' => $out->is_vice_captain,
            'order_index' => $out->order_index,
        ]);

        $out->delete();

        return $in->refresh();
    }

    public function remove(FootballMatch $match, int $teamId, int $playerId): void
    {
        MatchLineup::query()
            ->where('match_id', $match->id)
            ->where('team_id', $teamId)
            ->where('player_id', $playerId)
            ->delete();
    }

    public function forMatch(int $matchId): array
    {
        return MatchLineup::query()
            ->where('match_id', $matchId)
            ->with(['team', 'player'])
            ->orderBy('team_id')
            ->orderBy('is_starter', 'desc')
            ->orderBy('order_index')
            ->get()
            ->all();
    }

    protected function entryFor(FootballMatch $match, int $teamId, int $playerId): MatchLineup
    {
        $entry = MatchLineup::query()
            ->where('match_id', $match->id)
            ->where('team_id', $teamId)
            ->where('player_id', $playerId)
            ->first();

        if (! $entry) {
            throw new DomainException("Player {$playerId} is not part of this match lineup.");
        }

        return $entry;
    }

    protected function assertTeamInMatch(FootballMatch $match, int $teamId): void
    {
        if ((int) $teamId !== (int) $match->home_team_id && (int) $teamId !== (int) $match->away_team_id) {
            throw new DomainException('Team is not part of this match.');
        }
    }
}
