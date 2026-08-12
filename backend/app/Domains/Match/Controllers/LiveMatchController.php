<?php

namespace App\Domains\Match\Controllers;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\MatchLineup;
use App\Domains\Match\Queries\LiveMatchesQuery;
use App\Domains\Match\Repositories\MatchRepository;
use App\Domains\Match\Resources\EventResource;
use App\Domains\Match\Resources\LineupResource;
use App\Domains\Match\Resources\MatchResource;
use App\Domains\Match\Resources\PerformanceResource;
use App\Domains\Match\Resources\StatisticsResource;
use App\Domains\Match\Services\LineupService;
use App\Domains\Match\Services\LiveMatchService;
use App\Domains\Match\Services\MatchEventService;
use App\Domains\Match\Services\MatchStatisticsService;
use App\Domains\Match\Services\PlayerPerformanceService;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class LiveMatchController extends Controller
{
    public function __construct(
        protected MatchRepository $matches,
        protected LiveMatchService $liveService,
        protected MatchEventService $events,
        protected MatchStatisticsService $statistics,
        protected LineupService $lineups,
        protected PlayerPerformanceService $performances,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = LiveMatchesQuery::base()
            ->with([
                'homeTeam',
                'awayTeam',
                'stadium',
                'winnerTeam',
                'events' => fn ($q) => $q->orderBy('minute')->orderBy('id'),
                'statistics',
            ]);

        return MatchResource::collection($query->get());
    }

    public function show(FootballMatch $match): MatchResource
    {
        $match->loadMissing([
            'homeTeam',
            'awayTeam',
            'stadium',
            'winnerTeam',
            'events.team',
            'events.player',
            'events.assistPlayer',
            'statistics.team',
            'lineups.team',
            'lineups.player',
            'performances.player',
            'media',
            'matchRequest',
        ]);

        return new MatchResource($match);
    }

    public function start(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        return new MatchResource($this->liveService->start($match, (int) $request->user()->id));
    }

    public function pause(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        return new MatchResource($this->liveService->pause($match, (int) $request->user()->id));
    }

    public function resume(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        return new MatchResource($this->liveService->resume($match, (int) $request->user()->id));
    }

    public function setMinute(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        $request->validate(['minute' => 'required|integer|min:0|max:120']);

        return new MatchResource($this->liveService->setMinute($match, (int) $request->integer('minute'), (int) $request->user()->id));
    }

    public function finish(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        return new MatchResource($this->liveService->finish($match, (int) $request->user()->id));
    }

    public function cancel(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        $request->validate(['reason' => 'nullable|string|max:255']);

        return new MatchResource($this->liveService->cancel($match, $request->string('reason'), (int) $request->user()->id));
    }

    public function postpone(Request $request, FootballMatch $match): MatchResource
    {
        Gate::authorize('manage', $match);

        $request->validate(['reason' => 'nullable|string|max:255']);

        return new MatchResource($this->liveService->postpone($match, $request->string('reason'), (int) $request->user()->id));
    }

    public function storeEvent(Request $request, FootballMatch $match): EventResource
    {
        Gate::authorize('manage', $match);

        $data = $request->validate([
            'type' => 'required|in:goal,own_goal,penalty_goal,missed_penalty,assist,yellow_card,red_card,substitution,injury,timeout,half_time,kickoff,match_end,var',
            'team_id' => 'nullable|integer|exists:teams,id',
            'player_id' => 'nullable|integer|exists:players,id',
            'assist_player_id' => 'nullable|integer|exists:players,id',
            'minute' => 'nullable|integer|min:0|max:130',
            'added_time' => 'nullable|integer|min:0',
            'period' => 'nullable|string|max:30',
            'description' => 'nullable|string|max:500',
        ]);

        $this->assertTeamInMatch($match, isset($data['team_id']) ? (int) $data['team_id'] : null);
        $this->assertPlayerInMatch($match, isset($data['player_id']) ? (int) $data['player_id'] : null);
        $this->assertPlayerInMatch($match, isset($data['assist_player_id']) ? (int) $data['assist_player_id'] : null, 'assist_player_id');

        return new EventResource($this->events->record($match, $data, (int) $request->user()->id));
    }

    public function updateEvent(Request $request, MatchEvent $event): EventResource
    {
        $match = $event->match;
        Gate::authorize('manage', $match);

        $data = $request->validate([
            'type' => 'sometimes|in:goal,own_goal,penalty_goal,missed_penalty,assist,yellow_card,red_card,substitution,injury,timeout,half_time,kickoff,match_end,var',
            'team_id' => 'nullable|integer|exists:teams,id',
            'player_id' => 'nullable|integer|exists:players,id',
            'assist_player_id' => 'nullable|integer|exists:players,id',
            'minute' => 'nullable|integer|min:0|max:130',
            'added_time' => 'nullable|integer|min:0',
            'period' => 'nullable|string|max:30',
            'description' => 'nullable|string|max:500',
        ]);

        $this->assertTeamInMatch($match, isset($data['team_id']) ? (int) $data['team_id'] : null);
        $this->assertPlayerInMatch($match, isset($data['player_id']) ? (int) $data['player_id'] : null);
        $this->assertPlayerInMatch($match, isset($data['assist_player_id']) ? (int) $data['assist_player_id'] : null, 'assist_player_id');

        return new EventResource($this->events->update($event, $data, (int) $request->user()->id));
    }

    public function destroyEvent(Request $request, MatchEvent $event): JsonResponse
    {
        $match = $event->match;
        Gate::authorize('manage', $match);

        $this->events->delete($event, (int) $request->user()->id);

        return response()->json(['message' => 'Event deleted.', 'score' => [
            'home' => $match->home_score,
            'away' => $match->away_score,
        ]]);
    }

    public function updateStatistics(Request $request, FootballMatch $match): AnonymousResourceCollection
    {
        Gate::authorize('manage', $match);

        $data = $request->validate([
            'statistics' => 'required|array|min:2|max:2',
            'statistics.*.team_id' => 'required|integer|exists:teams,id',
            'statistics.*.possession' => 'nullable|integer|min:0|max:100',
            'statistics.*.shots' => 'nullable|integer|min:0',
            'statistics.*.shots_on_target' => 'nullable|integer|min:0',
            'statistics.*.corners' => 'nullable|integer|min:0',
            'statistics.*.fouls' => 'nullable|integer|min:0',
            'statistics.*.yellow_cards' => 'nullable|integer|min:0',
            'statistics.*.red_cards' => 'nullable|integer|min:0',
            'statistics.*.offsides' => 'nullable|integer|min:0',
            'statistics.*.saves' => 'nullable|integer|min:0',
            'statistics.*.passes' => 'nullable|integer|min:0',
            'statistics.*.pass_accuracy' => 'nullable|numeric|min:0|max:100',
            'statistics.*.expected_goals' => 'nullable|numeric|min:0',
        ]);

        foreach ($data['statistics'] as $row) {
            $this->assertTeamInMatch($match, (int) $row['team_id']);
        }

        $statisticTeamIds = array_map(fn ($row) => (int) $row['team_id'], $data['statistics']);

        if (count(array_unique($statisticTeamIds)) !== count($statisticTeamIds)) {
            throw ValidationException::withMessages([
                'statistics' => 'لا يمكن إرسال إحصائيات مكررة لنفس الفريق.',
            ]);
        }

        foreach ($data['statistics'] as $row) {
            $this->statistics->upsert($match, (int) $row['team_id'], $row);
        }

        $this->statistics->setPossession($match);

        return StatisticsResource::collection($this->statistics->forMatch($match->id));
    }

    public function setLineup(Request $request, FootballMatch $match): LineupResource
    {
        Gate::authorize('manage', $match);

        $data = $request->validate([
            'team_id' => 'required|integer|exists:teams,id',
            'starters' => 'required|array|max:11',
            'starters.*.player_id' => 'required|integer|exists:players,id',
            'starters.*.position' => 'nullable|string|max:20',
            'starters.*.shirt_number' => 'nullable|integer|min:1|max:99',
            'starters.*.order_index' => 'nullable|integer|min:0',
            'bench' => 'nullable|array|max:12',
            'bench.*.player_id' => 'required|integer|exists:players,id',
            'bench.*.position' => 'nullable|string|max:20',
            'bench.*.shirt_number' => 'nullable|integer|min:1|max:99',
            'captain_id' => 'nullable|integer|exists:players,id',
            'vice_captain_id' => 'nullable|integer|exists:players,id',
        ]);

        $teamId = (int) $data['team_id'];

        $this->assertTeamInMatch($match, $teamId);

        foreach ($data['starters'] as $player) {
            $this->assertPlayerInTeam($teamId, (int) $player['player_id']);
        }

        foreach ($data['bench'] ?? [] as $player) {
            $this->assertPlayerInTeam($teamId, (int) $player['player_id']);
        }

        $this->assertPlayerInTeam($teamId, isset($data['captain_id']) ? (int) $data['captain_id'] : null, 'captain_id');
        $this->assertPlayerInTeam($teamId, isset($data['vice_captain_id']) ? (int) $data['vice_captain_id'] : null, 'vice_captain_id');

        foreach ($data['starters'] as $index => $player) {
            $this->lineups->setStarter(
                $match,
                $teamId,
                (int) $player['player_id'],
                $player['position'] ?? null,
                isset($player['shirt_number']) ? (int) $player['shirt_number'] : null,
                (int) ($player['order_index'] ?? $index),
            );
        }

        foreach ($data['bench'] ?? [] as $player) {
            $this->lineups->addToBench($match, $teamId, (int) $player['player_id'], $player['position'] ?? null, isset($player['shirt_number']) ? (int) $player['shirt_number'] : null);
        }

        if (! empty($data['captain_id'])) {
            $this->lineups->setCaptain($match, $teamId, (int) $data['captain_id']);
        }

        if (! empty($data['vice_captain_id'])) {
            $this->lineups->setViceCaptain($match, $teamId, (int) $data['vice_captain_id']);
        }

        $lineup = MatchLineup::query()
            ->where('match_id', $match->id)
            ->where('team_id', $teamId)
            ->with(['team', 'player'])
            ->orderByDesc('is_starter')
            ->orderBy('order_index')
            ->get();

        return (new LineupResource((object) [
            'team_id' => $teamId,
            'team_name' => $lineup->first()?->team?->name,
            'starters' => $lineup->where('is_starter', true)->values(),
            'bench' => $lineup->where('is_starter', false)->values(),
            'formation' => null,
        ]))->additional(['players' => $lineup->values()]);
    }

    public function setPerformance(Request $request, FootballMatch $match): PerformanceResource
    {
        Gate::authorize('manage', $match);

        $data = $request->validate([
            'player_id' => 'required|integer|exists:players,id',
            'minutes_played' => 'nullable|integer|min:0|max:130',
            'rating' => 'nullable|numeric|min:0|max:10',
            'goals' => 'nullable|integer|min:0',
            'assists' => 'nullable|integer|min:0',
            'own_goals' => 'nullable|integer|min:0',
            'yellow_cards' => 'nullable|integer|min:0',
            'red_cards' => 'nullable|integer|min:0',
            'saves' => 'nullable|integer|min:0',
            'clean_sheet' => 'nullable|boolean',
        ]);

        $this->assertPlayerInMatch($match, (int) $data['player_id']);

        $performance = $this->performances->upsertPerformance($match, (int) $data['player_id'], $data);

        return new PerformanceResource($performance->load('player'));
    }

    public function awardMvp(Request $request, FootballMatch $match): PerformanceResource
    {
        Gate::authorize('manage', $match);

        $data = $request->validate(['player_id' => 'required|integer|exists:players,id']);

        $this->assertPlayerInMatch($match, (int) $data['player_id']);

        $performance = $this->performances->awardMvp($match, (int) $data['player_id']);

        return new PerformanceResource($performance->load('player'));
    }

    protected function matchTeamIds(FootballMatch $match): array
    {
        return array_values(array_filter([
            (int) $match->home_team_id,
            (int) $match->away_team_id,
        ]));
    }

    protected function assertTeamInMatch(FootballMatch $match, ?int $teamId): void
    {
        if ($teamId === null) {
            return;
        }

        if (! in_array($teamId, $this->matchTeamIds($match), true)) {
            throw ValidationException::withMessages([
                'team_id' => 'الفريق المحدد لا يشارك في هذه المباراة.',
            ]);
        }
    }

    protected function assertPlayerInMatch(FootballMatch $match, ?int $playerId, string $field = 'player_id'): void
    {
        if ($playerId === null) {
            return;
        }

        $teamIds = $this->matchTeamIds($match);

        if (empty($teamIds)) {
            throw ValidationException::withMessages([
                $field => 'لا يمكن إسناد لاعبين لهذه المباراة.',
            ]);
        }

        $belongsToMatchTeams = Player::query()
            ->where('id', $playerId)
            ->whereIn('team_id', $teamIds)
            ->exists();

        if (! $belongsToMatchTeams) {
            throw ValidationException::withMessages([
                $field => 'اللاعب المحدد لا يشارك في هذه المباراة.',
            ]);
        }
    }

    protected function assertPlayerInTeam(int $teamId, ?int $playerId, string $field = 'player_id'): void
    {
        if ($playerId === null) {
            return;
        }

        $belongsToTeam = Player::query()
            ->where('id', $playerId)
            ->where('team_id', $teamId)
            ->exists();

        if (! $belongsToTeam) {
            throw ValidationException::withMessages([
                $field => 'اللاعب المحدد لا ينتمي لهذا الفريق.',
            ]);
        }
    }
}
