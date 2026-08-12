<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TournamentFixtureService
{
    public function __construct(
        private readonly TournamentSetupService $setup,
    ) {}

    /**
     * @param  string|null  $startsOn  Y-m-d
     * @param  array<int>|null  $stadiumIds
     * @return array{generated: int, matches: array<int, array<string, mixed>>}
     */
    public function generateGroupFixtures(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        bool $doubleRoundRobin = false,
    ): array {
        return DB::transaction(function () use ($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin) {
            $this->setup->buildStructure($tournament);

            $season = $tournament->season;
            $competitionId = $tournament->competition_id;
            $seasonId = $tournament->season_id;

            $groupRound = Round::query()
                ->where('competition_id', $competitionId)
                ->where('season_id', $seasonId)
                ->where('stage', RoundStage::Group)
                ->firstOrFail();

            $groups = Group::query()
                ->where('competition_id', $competitionId)
                ->where('season_id', $seasonId)
                ->orderBy('name')
                ->get();

            $startDay = Carbon::parse($startsOn ?? $tournament->start_date?->toDateString() ?? now()->toDateString());
            $matchesPerDay = (int) ($tournament->matches_per_day ?? 0);

            $created = [];
            $usedStadiumSlots = [];

            foreach ($groups as $group) {
                $teamIds = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('status', TournamentTeam::STATUS_REGISTERED)
                    ->where('group_id', $group->id)
                    ->orderBy('group_position')
                    ->orderBy('id')
                    ->pluck('team_id')
                    ->all();

                if (count($teamIds) < 2) {
                    continue;
                }

                $schedules = $this->roundRobin($teamIds, $doubleRoundRobin);

                foreach ($schedules as $roundIndex => $pairs) {
                    foreach ($pairs as $pair) {
                        $dayOffset = $matchesPerDay > 0
                            ? intdiv(count($created), $matchesPerDay)
                            : $roundIndex;

                        $matchDay = $startDay->copy()->addDays($dayOffset);

                        $stadiumId = $this->pickStadium($stadiumIds, $usedStadiumSlots, $matchDay->toDateString(), $defaultTime);

                        [$datetime, $timeSlot] = $this->reserveSlot(
                            $usedStadiumSlots,
                            $stadiumId,
                            $matchDay->toDateString(),
                            $defaultTime,
                        );

                        if (MatchMembershipService::teamHasMatchConflict($pair[0], $datetime)
                            || MatchMembershipService::teamHasMatchConflict($pair[1], $datetime)) {
                            continue;
                        }

                        $match = FootballMatch::create([
                            'competition_id' => $competitionId,
                            'season_id' => $seasonId,
                            'round_id' => $groupRound->id,
                            'group_id' => $group->id,
                            'home_team_id' => $pair[0],
                            'away_team_id' => $pair[1],
                            'stadium_id' => $stadiumId,
                            'status' => MatchStatus::Scheduled,
                            'current_period' => 'upcoming',
                            'match_duration_minutes' => $tournament->match_duration_minutes ?: 90,
                            'created_by' => $tournament->organizer_id,
                        ]);

                        $fixture = Fixture::create([
                            'competition_id' => $competitionId,
                            'season_id' => $seasonId,
                            'round_id' => $groupRound->id,
                            'matchday' => $roundIndex + 1,
                            'group_id' => $group->id,
                            'match_id' => $match->id,
                            'stadium_id' => $stadiumId,
                            'home_team_id' => $pair[0],
                            'away_team_id' => $pair[1],
                            'scheduled_at' => $datetime,
                            'status' => FixtureStatus::Scheduled,
                        ]);

                        $created[] = [
                            'id' => $fixture->id,
                            'match_id' => $match->id,
                            'group' => $group->name,
                            'home_team_id' => $pair[0],
                            'away_team_id' => $pair[1],
                            'scheduled_at' => $datetime->toIso8601String(),
                            'stadium_id' => $stadiumId,
                        ];

                        $usedStadiumSlots[$stadiumId][$timeSlot] = ($usedStadiumSlots[$stadiumId][$timeSlot] ?? 0) + 1;
                    }
                }
            }

            return [
                'generated' => count($created),
                'matches' => $created,
            ];
        });
    }

    public function regenerateGroupFixtures(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        bool $doubleRoundRobin = false,
    ): array {
        return DB::transaction(function () use ($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin) {
            $this->deleteGroupFixtures($tournament);

            return $this->generateGroupFixtures($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin);
        });
    }

    public function deleteGroupFixtures(Tournament $tournament): int
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        if (! $competitionId || ! $seasonId) {
            return 0;
        }

        $fixtures = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->get();

        $matchIds = $fixtures->pluck('match_id')->filter()->values();

        if ($matchIds->isNotEmpty()) {
            FootballMatch::whereKey($matchIds->all())->delete();
        }

        $count = $fixtures->count();
        Fixture::whereKey($fixtures->pluck('id')->all())->delete();

        return $count;
    }

    /**
     * Returns the tournament's round structure (group matchdays + knockout rounds)
     * with per-round status counters. Used to drive the committee matches navigation.
     *
     * @return array{
     *     group_stage: array<int, array<string, mixed>>,
     *     knockout: array<int, array<string, mixed>>,
     * }
     */
    public function matchRounds(Tournament $tournament): array
    {
        if (! $tournament->competition_id || ! $tournament->season_id) {
            return ['group_stage' => [], 'knockout' => []];
        }

        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        $rounds = Round::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->orderBy('order_index')
            ->get();

        $groupStage = [];
        $matchdays = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereNotNull('matchday')
            ->distinct()
            ->orderBy('matchday')
            ->pluck('matchday');

        foreach ($matchdays as $matchday) {
            $groupStage[] = array_merge(
                ['matchday' => (int) $matchday],
                $this->roundCounts($tournament, ['matchday' => (int) $matchday]),
            );
        }

        $knockout = [];
        foreach ($rounds->where('stage', '!=', RoundStage::Group) as $round) {
            $knockout[] = array_merge([
                'round_id' => $round->id,
                'stage' => $round->stage->value,
                'name' => $round->name,
                'order_index' => $round->order_index,
            ], $this->roundCounts($tournament, ['round_id' => $round->id]));
        }

        return [
            'group_stage' => $groupStage,
            'knockout' => $knockout,
        ];
    }

    /**
     * @param  array{matchday?: int, round_id?: int}  $scopes
     * @return array{total: int, completed: int, live: int, upcoming: int, pending: int, postponed: int, cancelled: int}
     */
    private function roundCounts(Tournament $tournament, array $scopes): array
    {
        $query = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id);

        if (isset($scopes['matchday'])) {
            $query->where('matchday', $scopes['matchday']);
        }

        if (isset($scopes['round_id'])) {
            $query->where('round_id', $scopes['round_id']);
        }

        $fixtures = $query->get(['id', 'status', 'match_id', 'scheduled_at']);

        $matchIds = $fixtures->pluck('match_id')->filter()->values();
        $matchStatuses = $matchIds->isNotEmpty()
            ? FootballMatch::query()->whereKey($matchIds->all())->pluck('status', 'id')
            : collect();

        $now = now();
        $counts = [
            'total' => $fixtures->count(),
            'completed' => 0,
            'live' => 0,
            'upcoming' => 0,
            'pending' => 0,
            'postponed' => 0,
            'cancelled' => 0,
        ];

        foreach ($fixtures as $fixture) {
            $fixtureStatus = $fixture->status?->value;

            if ($fixtureStatus === FixtureStatus::Postponed->value) {
                $counts['postponed']++;

                continue;
            }

            if ($fixtureStatus === FixtureStatus::Cancelled->value) {
                $counts['cancelled']++;

                continue;
            }

            $matchStatus = $matchStatuses->get($fixture->match_id);

            if ($matchStatus === MatchStatus::Finished->value) {
                $counts['completed']++;

                continue;
            }

            if (in_array($matchStatus, MatchStatus::live(), true)) {
                $counts['live']++;

                continue;
            }

            if ($fixture->scheduled_at && $fixture->scheduled_at->isAfter($now)) {
                $counts['upcoming']++;

                continue;
            }

            $counts['pending']++;
        }

        return $counts;
    }

    /**
     * @param  array<int, int>  $teamIds
     * @return array<int, array<int, array{0: int, 1: int}>
     */
    private function roundRobin(array $teamIds, bool $doubleRoundRobin = false): array
    {
        if (count($teamIds) < 2) {
            throw new DomainException('المجموعة يجب أن تضم فريقين على الأقل');
        }

        $teams = array_values($teamIds);
        $count = count($teams);

        if ($count % 2 === 1) {
            $teams[] = null;
            $count++;
        }

        $roundCount = $count - 1;
        $pairsPerRound = intdiv($count, 2);
        $schedules = [];

        for ($round = 0; $round < $roundCount; $round++) {
            $pairs = [];

            for ($i = 0; $i < $pairsPerRound; $i++) {
                $home = $teams[$i];
                $away = $teams[$count - 1 - $i];

                if ($home !== null && $away !== null) {
                    $pairs[] = [$home, $away];
                }
            }

            if ($doubleRoundRobin) {
                foreach ($pairs as $pair) {
                    $pairs[] = [$pair[1], $pair[0]];
                }
            }

            $schedules[] = $pairs;

            $last = array_pop($teams);
            array_splice($teams, 1, 0, [$last]);
        }

        return $schedules;
    }

    /**
     * @param  array<int>|null  $stadiumIds
     * @param  array<int, array<string, int>>  $usedStadiumSlots
     */
    private function pickStadium(?array $stadiumIds, array &$usedStadiumSlots, string $date, string $defaultTime): ?int
    {
        if (empty($stadiumIds)) {
            return null;
        }

        $leastBusy = null;
        $leastCount = PHP_INT_MAX;
        $endTime = $this->endTimeFor($defaultTime);

        foreach ($stadiumIds as $stadiumId) {
            // Never schedule on a terrain already booked by a manager at this time.
            if (TerrainBooking::getConflictMessage($stadiumId, $date, $defaultTime, $endTime)) {
                continue;
            }

            $count = 0;
            foreach ($usedStadiumSlots[$stadiumId] ?? [] as $slot => $slotCount) {
                if (str_starts_with($slot, $date)) {
                    $count += $slotCount;
                }
            }

            if ($count < $leastCount) {
                $leastCount = $count;
                $leastBusy = $stadiumId;
            }
        }

        return $leastBusy;
    }

    private function endTimeFor(string $startTime): string
    {
        return Carbon::parse($startTime)->addHours(2)->format('H:i');
    }

    /**
     * @param  array<int, array<string, int>>  $usedStadiumSlots
     * @return array{0: Carbon, 1: string}
     */
    private function reserveSlot(array &$usedStadiumSlots, ?int $stadiumId, string $date, string $defaultTime): array
    {
        $time = $defaultTime;

        while ($stadiumId !== null) {
            $slot = $date.' '.$time.':00';
            $count = $usedStadiumSlots[$stadiumId][$slot] ?? 0;

            if ($count < 1 && ! TerrainBooking::getConflictMessage($stadiumId, $date, $time, $this->endTimeFor($time))) {
                break;
            }

            $time = Carbon::parse($slot)->addHours(2)->format('H:i');

            if ($time === $defaultTime) {
                $date = Carbon::parse($date)->addDay()->toDateString();
            }
        }

        return [Carbon::parse($date.' '.$time.':00'), $date.' '.$time.':00'];
    }
}
