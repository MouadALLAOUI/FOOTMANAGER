<?php

namespace App\Domains\Competition\Controllers;

use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Resources\CompetitionFixtureResource;
use App\Domains\Competition\Resources\CompetitionResource;
use App\Domains\Competition\Resources\SeasonResource;
use App\Domains\Competition\Resources\StandingResource;
use App\Domains\Competition\Services\StandingsService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompetitionController extends Controller
{
    public function __construct(
        protected StandingsService $standings,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $competitions = Competition::query()
            ->when($request->boolean('active_only'), fn ($q) => $q->where('active', true))
            ->when($request->string('type')->isNotEmpty(), fn ($q) => $q->where('type', $request->string('type')))
            ->withCount('seasons')
            ->latest()
            ->get();

        return CompetitionResource::collection($competitions);
    }

    public function show(Competition $competition): CompetitionResource
    {
        $competition->loadCount('seasons');

        return new CompetitionResource($competition);
    }

    public function seasons(Competition $competition): AnonymousResourceCollection
    {
        return SeasonResource::collection(
            $competition->seasons()->withCount(['rounds', 'fixtures'])->get(),
        );
    }

    public function fixtures(Request $request, Competition $competition): AnonymousResourceCollection
    {
        $fixtures = $competition->fixtures()
            ->with(['homeTeam', 'awayTeam', 'round', 'competition', 'match'])
            ->when($request->integer('season_id'), fn ($q, $id) => $q->where('season_id', $id))
            ->when($request->integer('round_id'), fn ($q, $id) => $q->where('round_id', $id))
            ->latest('scheduled_at')
            ->get();

        return CompetitionFixtureResource::collection($fixtures);
    }

    public function standings(Request $request, Competition $competition): AnonymousResourceCollection
    {
        $seasonId = $request->integer('season_id') ?: null;
        $groupId = $request->integer('group_id') ?: null;

        $rows = $this->standings->forCompetition($competition->id, $seasonId, $groupId);

        foreach ($rows as $index => $row) {
            $row['position'] = $index + 1;
        }

        return StandingResource::collection($rows);
    }
}
