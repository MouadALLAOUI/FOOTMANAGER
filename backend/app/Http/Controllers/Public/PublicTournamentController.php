<?php

namespace App\Http\Controllers\Public;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Resources\EventResource;
use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentGalleryImage;
use App\Domains\Tournament\Models\TournamentNews;
use App\Domains\Tournament\Resources\TournamentDetailResource;
use App\Domains\Tournament\Resources\TournamentFixtureResource;
use App\Domains\Tournament\Resources\TournamentGalleryImageResource;
use App\Domains\Tournament\Resources\TournamentNewsResource;
use App\Domains\Tournament\Resources\TournamentPartnerResource;
use App\Domains\Tournament\Resources\TournamentResource;
use App\Domains\Tournament\Resources\TournamentSponsorResource;
use App\Domains\Tournament\Resources\TournamentTeamResource;
use App\Domains\Tournament\Services\TournamentBracketService;
use App\Domains\Tournament\Services\TournamentDrawService;
use App\Domains\Tournament\Services\TournamentStandingsService;
use App\Domains\Tournament\Services\TournamentStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicTournamentController extends Controller
{
    public function __construct(
        private readonly TournamentDrawService $draw,
        private readonly TournamentStandingsService $standings,
        private readonly TournamentBracketService $bracket,
        private readonly TournamentStatisticsService $statistics,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Tournament::query()
            ->with('organizer')
            ->whereIn('status', [
                Tournament::STATUS_OPEN_FOR_REGISTRATION,
                Tournament::STATUS_REGISTRATION_CLOSED,
                Tournament::STATUS_IN_PROGRESS,
                Tournament::STATUS_COMPLETED,
            ])
            ->latest();

        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $tournaments = $query->paginate($perPage);

        return response()->json([
            'data' => TournamentResource::collection($tournaments),
            'meta' => [
                'current_page' => $tournaments->currentPage(),
                'per_page' => $tournaments->perPage(),
                'total' => $tournaments->total(),
                'last_page' => $tournaments->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        $tournament->load(['organizer', 'stadium'])->loadCount('tournamentTeams');

        return response()->json(['data' => new TournamentDetailResource($tournament)]);
    }

    public function fixtures(Request $request, string $tournament): AnonymousResourceCollection
    {
        $tournament = $this->resolveTournament($tournament);

        $fixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->get();

        return TournamentFixtureResource::collection($fixtures);
    }

    public function teams(Request $request, string $tournament): AnonymousResourceCollection
    {
        $tournament = $this->resolveTournament($tournament);

        $teams = $tournament->tournamentTeams()
            ->with(['team', 'group'])
            ->get();

        return TournamentTeamResource::collection($teams);
    }

    public function draw(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        return response()->json(['data' => $this->draw->currentDraw($tournament, $tournament->group_mode === 'free')]);
    }

    public function standings(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        return response()->json(['data' => $this->standings->standings($tournament)]);
    }

    public function bracket(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        return response()->json(['data' => $this->bracket->bracket($tournament)]);
    }

    public function statistics(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        return response()->json(['data' => $this->statistics->statistics($tournament)]);
    }

    /**
     * Read-only single-match detail (used when opening a fixture/result).
     */
    public function matchDetail(Request $request, string $tournament, string $match): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        $match = FootballMatch::query()
            ->with(['homeTeam:id,name,logo_path', 'awayTeam:id,name,logo_path'])
            ->whereKey((int) $match)
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->first();

        abort_unless($match instanceof FootballMatch, 404);

        $fixture = Fixture::query()
            ->where('match_id', $match->id)
            ->with(['round', 'group', 'stadium:id,name'])
            ->first();

        $events = MatchEvent::query()
            ->where('match_id', $match->id)
            ->with(['team:id,name', 'player:id,name,number', 'assistPlayer:id,name,number'])
            ->orderBy('minute')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => [
            'id' => $match->id,
            'status' => $match->status?->value,
            'is_live' => $match->status instanceof MatchStatus && $match->status->isLive(),
            'is_finished' => $match->isFinished(),
            'current_period' => $match->current_period,
            'current_minute' => $match->current_minute,
            'home_team' => $match->homeTeam ? [
                'id' => $match->homeTeam->id,
                'name' => $match->homeTeam->name,
                'logo_url' => $match->homeTeam->logo_url,
            ] : null,
            'away_team' => $match->awayTeam ? [
                'id' => $match->awayTeam->id,
                'name' => $match->awayTeam->name,
                'logo_url' => $match->awayTeam->logo_url,
            ] : null,
            'home_score' => $match->home_score,
            'away_score' => $match->away_score,
            'home_penalties' => $match->home_penalties,
            'away_penalties' => $match->away_penalties,
            'extra_time' => (bool) $match->extra_time,
            'winner_team_id' => $match->winner_team_id,
            'stadium' => $fixture?->stadium ? [
                'id' => $fixture->stadium->id,
                'name' => $fixture->stadium->name,
            ] : null,
            'round' => $fixture?->round ? [
                'id' => $fixture->round->id,
                'name' => $fixture->round->name,
                'stage' => $fixture->round->stage?->value,
            ] : null,
            'group' => $fixture?->group ? [
                'id' => $fixture->group->id,
                'name' => $fixture->group->name,
            ] : null,
            'scheduled_at' => $fixture?->scheduled_at?->toIso8601String(),
            'started_at' => $match->started_at?->toIso8601String(),
            'ended_at' => $match->ended_at?->toIso8601String(),
            'events' => EventResource::collection($events),
        ]]);
    }

    public function news(Request $request, string $tournament): AnonymousResourceCollection
    {
        $tournament = $this->resolveTournament($tournament);

        $news = TournamentNews::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentNews::STATUS_PUBLISHED)
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        return TournamentNewsResource::collection($news);
    }

    public function newsDetail(Request $request, string $tournament, string $news): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        $item = TournamentNews::query()
            ->where('tournament_id', $tournament->id)
            ->whereKey((int) $news)
            ->where('status', TournamentNews::STATUS_PUBLISHED)
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()))
            ->first();

        abort_unless($item instanceof TournamentNews, 404);

        return response()->json(['data' => new TournamentNewsResource($item)]);
    }

    public function gallery(Request $request, string $tournament): AnonymousResourceCollection
    {
        $tournament = $this->resolveTournament($tournament);

        $images = TournamentGalleryImage::query()
            ->where('tournament_id', $tournament->id)
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        return TournamentGalleryImageResource::collection($images);
    }

    public function sponsors(Request $request, string $tournament): AnonymousResourceCollection
    {
        $tournament = $this->resolveTournament($tournament);

        $sponsors = $tournament->sponsors()
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        return TournamentSponsorResource::collection($sponsors);
    }

    public function partners(Request $request, string $tournament): AnonymousResourceCollection
    {
        $tournament = $this->resolveTournament($tournament);

        $partners = $tournament->partners()
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        return TournamentPartnerResource::collection($partners);
    }

    private function resolveTournament(string $key): Tournament
    {
        $tournament = is_numeric($key)
            ? Tournament::query()->whereKey((int) $key)->first()
            : Tournament::query()->where('slug', $key)->first();

        abort_unless($tournament instanceof Tournament, 404);
        $this->abortIfPrivate($tournament);

        return $tournament;
    }

    private function abortIfPrivate(Tournament $tournament): void
    {
        abort_unless($tournament->isVisiblePublicly(), 404);
    }
}
