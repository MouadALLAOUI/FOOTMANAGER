<?php

namespace App\Domains\Team\Services;

use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use Illuminate\Support\Facades\Cache;

class TeamDashboardService
{
    public function __construct(
        private TeamProfileService $profile,
        private TeamFixtureService $fixtures,
        private TeamStatisticsService $statistics,
        private TeamFormationService $formations,
        private PlayerStatisticsService $playerStatistics,
    ) {}

    public function for(Team $team): array
    {
        $ttl = (int) config('team.cache.dashboard_ttl');

        return Cache::remember(TeamCache::dashboard($team->id), $ttl, function () use ($team) {
            $team->load(['primaryStadium', 'captain', 'viceCaptain', 'manager:id,name,phone,status,is_whatsapp']);

            $upcoming = $this->fixtures->upcoming($team, 1)->first();
            $recentResults = array_slice($this->fixtures->history($team, 5)->items(), 0, 5);

            $newestPlayers = $team->players()
                ->latest('created_at')
                ->limit(5)
                ->get(['id', 'name', 'number', 'position', 'status', 'created_at']);

            $summaries = $this->playerStatistics->summaries($team);

            return [
                'team' => $team,
                'upcoming_fixture' => $upcoming,
                'recent_results' => $recentResults,
                'attendance_summary' => $this->attendanceSummary($team),
                'announcements' => $team->announcements()
                    ->whereNotNull('published_at')
                    ->withCount('reads')
                    ->with('creator:id,name')
                    ->limit(3)
                    ->get(),
                'statistics' => $this->statistics->for($team),
                'formation' => $this->formations->get($team),
                'newest_players' => $newestPlayers->map(function ($player) use ($summaries) {
                    return $player->toArray() + ($summaries[$player->id] ?? []);
                })->values(),
            ];
        });
    }

    private function attendanceSummary(Team $team): array
    {
        $totals = Attendance::query()
            ->where('team_id', $team->id)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as present', [Attendance::PRESENT])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as absent', [Attendance::ABSENT])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as late', [Attendance::LATE])
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as excused', [Attendance::EXCUSED])
            ->first();

        return [
            'total_records' => (int) ($totals->total ?? 0),
            'present' => (int) ($totals->present ?? 0),
            'absent' => (int) ($totals->absent ?? 0),
            'late' => (int) ($totals->late ?? 0),
            'excused' => (int) ($totals->excused ?? 0),
        ];
    }
}
