<?php

namespace App\Domains\Team\Services;

use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamMatchPlayer;

class PlayerStatisticsService
{
    /**
     * Per-player attendance + match participation summaries for a team.
     */
    public function summaries(Team $team): array
    {
        $players = $team->players()->get(['id', 'name', 'number', 'status']);

        $attendanceTotals = Attendance::query()
            ->where('team_id', $team->id)
            ->selectRaw('player_id')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as attended', [Attendance::PRESENT, Attendance::LATE])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as absent', [Attendance::ABSENT])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as late', [Attendance::LATE])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as excused', [Attendance::EXCUSED])
            ->groupBy('player_id')
            ->get()
            ->keyBy('player_id');

        $matchTotals = TeamMatchPlayer::query()
            ->where('team_id', $team->id)
            ->selectRaw('player_id')
            ->selectRaw('SUM(CASE WHEN played = 1 THEN 1 ELSE 0 END) as matches_played')
            ->selectRaw('SUM(CASE WHEN started = 1 THEN 1 ELSE 0 END) as started')
            ->groupBy('player_id')
            ->get()
            ->keyBy('player_id');

        $summaries = [];

        foreach ($players as $player) {
            $att = $attendanceTotals->get($player->id);
            $mt = $matchTotals->get($player->id);

            $total = (int) ($att->total ?? 0);
            $attended = (int) ($att->attended ?? 0);

            $summaries[$player->id] = [
                'player_id' => $player->id,
                'name' => $player->name,
                'number' => $player->number,
                'status' => $player->status,
                'attendance_percentage' => $total > 0 ? round(($attended / $total) * 100, 1) : 0,
                'attendance_count' => $total,
                'matches_played' => (int) ($mt->matches_played ?? 0),
                'matches_started' => (int) ($mt->started ?? 0),
                'missed_matches' => (int) ($att->absent ?? 0),
                'late_count' => (int) ($att->late ?? 0),
                'excused_count' => (int) ($att->excused ?? 0),
            ];
        }

        return $summaries;
    }

    public function forPlayer(int $playerId): array
    {
        $att = Attendance::query()
            ->where('player_id', $playerId)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as attended', [Attendance::PRESENT, Attendance::LATE])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as absent', [Attendance::ABSENT])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as late', [Attendance::LATE])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as excused', [Attendance::EXCUSED])
            ->first();

        $matchesPlayed = (int) TeamMatchPlayer::where('player_id', $playerId)->where('played', true)->count();

        $total = (int) ($att->total ?? 0);
        $attended = (int) ($att->attended ?? 0);

        return [
            'attendance_percentage' => $total > 0 ? round(($attended / $total) * 100, 1) : 0,
            'matches_played' => $matchesPlayed,
            'missed_matches' => (int) ($att->absent ?? 0),
            'late_count' => (int) ($att->late ?? 0),
            'excused_count' => (int) ($att->excused ?? 0),
        ];
    }
}
