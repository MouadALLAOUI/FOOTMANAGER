<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AnalyticsController extends Controller
{
    private const MAX_RANGE_DAYS = 366;

    private const VALID_GROUP_BY = ['hour', 'day', 'week', 'month'];

    public function platform(Request $request): JsonResponse
    {
        $groupBy = in_array($request->query('group_by', 'day'), self::VALID_GROUP_BY, true)
            ? $request->query('group_by')
            : 'day';

        [$from, $to] = $this->resolveRange($request);

        $payload = Cache::remember(
            "admin:analytics:platform:{$from->toDateTimeString()}:{$to->toDateTimeString()}:{$groupBy}",
            60,
            fn () => $this->buildPlatformPayload($from, $to, $groupBy)
        );

        return response()->json($payload);
    }

    private function resolveRange(Request $request): array
    {
        $tz = config('app.timezone', 'UTC');

        $toDate = $request->query('to')
            ? Carbon::parse($request->query('to'), $tz)->startOfDay()
            : Carbon::now($tz)->startOfDay();
        $fromDate = $request->query('from')
            ? Carbon::parse($request->query('from'), $tz)->startOfDay()
            : $toDate->copy()->subDays(29);

        if ($fromDate->gt($toDate)) {
            $fromDate = $toDate->copy()->subDays(29);
        }
        if ($fromDate->diffInDays($toDate) > self::MAX_RANGE_DAYS) {
            $fromDate = $toDate->copy()->subDays(self::MAX_RANGE_DAYS);
        }

        return [
            $fromDate->copy()->startOfDay(),
            $toDate->copy()->endOfDay(),
        ];
    }

    private function buildPlatformPayload(Carbon $from, Carbon $to, string $groupBy): array
    {
        $range = [
            'from' => $from->toDateString(),
            'to' => $to->copy()->endOfDay()->toDateString(),
            'group_by' => $groupBy,
        ];

        $summary = [
            'users' => [
                'total' => (int) User::count(),
                'approved' => (int) User::where('status', 'approved')->count(),
                'pending' => (int) User::where('status', 'pending')->count(),
                'blocked' => (int) User::where('status', 'blocked')->count(),
                'by_role' => $this->groupedCounts(User::query(), 'role'),
            ],
            'teams' => (int) Team::count(),
            'terrains' => [
                'total' => (int) Stadium::count(),
                'available' => (int) Stadium::where('is_available', true)->count(),
            ],
            'tournaments' => [
                'total' => (int) Tournament::count(),
                'by_status' => $this->groupedCounts(Tournament::query(), 'status'),
            ],
            'matches' => [
                'total' => (int) FootballMatch::count(),
                'finished' => (int) FootballMatch::where('status', 'finished')->count(),
                'by_status' => $this->groupedCounts(FootballMatch::query(), 'status'),
            ],
            'bookings' => [
                'total' => (int) TerrainBooking::count(),
                'by_status' => $this->groupedCounts(TerrainBooking::query(), 'status'),
            ],
            'match_requests' => [
                'total' => (int) MatchRequest::count(),
                'by_status' => $this->groupedCounts(MatchRequest::query(), 'status'),
            ],
        ];

        $trendSources = [
            'users' => [User::query(), 'created_at'],
            'teams' => [Team::query(), 'created_at'],
            'tournaments' => [Tournament::query(), 'created_at'],
            'matches' => [FootballMatch::query(), 'created_at'],
            'matches_finished' => [FootballMatch::query()->where('status', 'finished'), 'ended_at'],
            'bookings' => [TerrainBooking::query(), 'created_at'],
        ];

        $trends = [];
        foreach ($trendSources as $name => [$query, $column]) {
            if ($groupBy === 'hour') {
                $raw = $this->hourlyCounts($query, $column, $from, $to);
            } else {
                $raw = $this->dailyCounts($query, $column, $from, $to);
            }
            $trends[$name] = $this->bucketSeries($this->normalizeCounts($raw, $groupBy), $from, $to, $groupBy);
        }

        return [
            'range' => $range,
            'summary' => $summary,
            'trends' => $trends,
        ];
    }

    private function groupedCounts(Builder $query, string $column): array
    {
        return $query
            ->selectRaw("{$column} as bucket, COUNT(*) as c")
            ->groupBy($column)
            ->get()
            ->keyBy('bucket')
            ->map(fn ($row) => (int) $row->c)
            ->all();
    }

    private function dailyCounts(Builder $query, string $column, Carbon $from, Carbon $to): array
    {
        return $query
            ->whereBetween($column, [$from, $to])
            ->selectRaw("DATE({$column}) as bucket, COUNT(*) as c")
            ->groupBy('bucket')
            ->get()
            ->keyBy('bucket')
            ->map(fn ($row) => (int) $row->c)
            ->all();
    }

    private function hourlyCounts(Builder $query, string $column, Carbon $from, Carbon $to): array
    {
        return $query
            ->whereBetween($column, [$from, $to])
            ->selectRaw("DATE({$column}) as day_key, HOUR({$column}) as hour_key, COUNT(*) as c")
            ->groupBy('day_key', 'hour_key')
            ->get()
            ->mapWithKeys(fn ($row) => [(string) $row->hour_key => (int) $row->c])
            ->all();
    }

    private function normalizeCounts(array $counts, string $granularity): array
    {
        $normalized = [];
        foreach ($counts as $date => $count) {
            if ($granularity === 'hour') {
                $key = (string) ((int) $date);
            } elseif ($granularity === 'day') {
                $key = (string) $date;
            } elseif ($granularity === 'week') {
                $key = Carbon::parse($date)->startOfWeek()->toDateString();
            } else {
                $key = substr((string) $date, 0, 7);
            }
            $normalized[$key] = ($normalized[$key] ?? 0) + $count;
        }

        return $normalized;
    }

    private function bucketSeries(array $counts, Carbon $from, Carbon $to, string $granularity): array
    {
        $series = [];

        if ($granularity === 'hour') {
            for ($hour = 0; $hour < 24; $hour++) {
                $key = (string) $hour;
                $series[] = ['key' => $key, 'count' => $counts[$key] ?? 0];
            }
        } elseif ($granularity === 'day') {
            for ($date = $from->copy(); $date->lte($to); $date->addDay()) {
                $key = $date->toDateString();
                $series[] = ['key' => $key, 'count' => $counts[$key] ?? 0];
            }
        } elseif ($granularity === 'week') {
            for ($date = $from->copy()->startOfWeek(); $date->lte($to); $date->addWeek()) {
                $key = $date->toDateString();
                $series[] = ['key' => $key, 'count' => $counts[$key] ?? 0];
            }
        } else {
            for ($date = $from->copy()->startOfMonth(); $date->lte($to); $date->addMonth()) {
                $key = $date->format('Y-m');
                $series[] = ['key' => $key, 'count' => $counts[$key] ?? 0];
            }
        }

        return $series;
    }
}
