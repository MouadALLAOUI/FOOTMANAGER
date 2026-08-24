<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchLineup;
use App\Domains\Match\Models\MatchRequest;
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

    public function setFreeKickTaker(FootballMatch $match, int $teamId, int $playerId): MatchLineup
    {
        $entry = $this->entryFor($match, $teamId, $playerId);

        MatchLineup::query()
            ->where('match_id', $match->id)
            ->where('team_id', $teamId)
            ->update(['is_free_kick_taker' => false]);

        $entry->is_free_kick_taker = true;
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
            'is_free_kick_taker' => $out->is_free_kick_taker,
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

    // ── Match-Request Lineup Methods ──────────────────────────

    public function upsertForMatchRequest(MatchRequest $matchRequest, int $teamId, array $players): void
    {
        $existingPlayerIds = MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->pluck('player_id')
            ->toArray();

        $incomingPlayerIds = array_column($players, 'player_id');

        $toRemove = array_diff($existingPlayerIds, $incomingPlayerIds);
        if (! empty($toRemove)) {
            MatchLineup::query()
                ->where('match_request_id', $matchRequest->id)
                ->where('team_id', $teamId)
                ->whereIn('player_id', $toRemove)
                ->delete();
        }

        foreach ($players as $index => $entry) {
            $captainCount = MatchLineup::query()
                ->where('match_request_id', $matchRequest->id)
                ->where('team_id', $teamId)
                ->where('is_captain', true)
                ->where('player_id', '!=', $entry['player_id'])
                ->count();

            $viceCaptainCount = MatchLineup::query()
                ->where('match_request_id', $matchRequest->id)
                ->where('team_id', $teamId)
                ->where('is_vice_captain', true)
                ->where('player_id', '!=', $entry['player_id'])
                ->count();

            $fkCount = MatchLineup::query()
                ->where('match_request_id', $matchRequest->id)
                ->where('team_id', $teamId)
                ->where('is_free_kick_taker', true)
                ->where('player_id', '!=', $entry['player_id'])
                ->count();

            MatchLineup::query()->updateOrCreate(
                [
                    'match_request_id' => $matchRequest->id,
                    'team_id' => $teamId,
                    'player_id' => $entry['player_id'],
                ],
                [
                    'position' => $entry['position'] ?? null,
                    'shirt_number' => $entry['shirt_number'] ?? null,
                    'is_starter' => $entry['is_starter'] ?? false,
                    'is_captain' => (! empty($entry['is_captain']) && $captainCount === 0),
                    'is_vice_captain' => (! empty($entry['is_vice_captain']) && $viceCaptainCount === 0),
                    'is_free_kick_taker' => (! empty($entry['is_free_kick_taker']) && $fkCount === 0),
                    'order_index' => $entry['order_index'] ?? $index,
                ],
            );
        }
    }

    public function forMatchRequest(int $matchRequestId): array
    {
        return MatchLineup::query()
            ->where('match_request_id', $matchRequestId)
            ->with(['team', 'player'])
            ->orderBy('team_id')
            ->orderBy('is_starter', 'desc')
            ->orderBy('order_index')
            ->get()
            ->all();
    }

    public function setCaptainForMatchRequest(MatchRequest $matchRequest, int $teamId, int $playerId): MatchLineup
    {
        $entry = MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->where('player_id', $playerId)
            ->firstOrFail();

        MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->where('id', '!=', $entry->id)
            ->update(['is_captain' => false]);

        $entry->update(['is_captain' => true, 'is_vice_captain' => false]);

        return $entry->fresh();
    }

    public function setViceCaptainForMatchRequest(MatchRequest $matchRequest, int $teamId, int $playerId): MatchLineup
    {
        $entry = MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->where('player_id', $playerId)
            ->firstOrFail();

        $entry->update(['is_captain' => false, 'is_vice_captain' => true]);

        return $entry->fresh();
    }

    public function setFreeKickTakerForMatchRequest(MatchRequest $matchRequest, int $teamId, int $playerId): MatchLineup
    {
        $entry = MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->where('player_id', $playerId)
            ->firstOrFail();

        MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->update(['is_free_kick_taker' => false]);

        $entry->update(['is_free_kick_taker' => true]);

        return $entry->fresh();
    }

    public function removeForMatchRequest(MatchRequest $matchRequest, int $teamId, int $playerId): void
    {
        MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->where('player_id', $playerId)
            ->delete();
    }

    // ── Format Helpers ────────────────────────────────────────

    public static function startersRequired(?string $playerFormat): int
    {
        if (! $playerFormat) {
            return 7;
        }

        return match ($playerFormat) {
            '5v5' => 5,
            '7v7' => 7,
            '8v8' => 8,
            '11v11' => 11,
            default => 7,
        };
    }

    public static function validateStarterCount(MatchRequest $matchRequest, int $teamId): ?string
    {
        $required = self::startersRequired($matchRequest->player_format);

        $starters = MatchLineup::query()
            ->where('match_request_id', $matchRequest->id)
            ->where('team_id', $teamId)
            ->where('is_starter', true)
            ->count();

        if ($starters > $required) {
            return "يجب أن يكون {$required} لاعبين أساسيين كحد أقصى لصيغة {$matchRequest->player_format}";
        }

        return null;
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
