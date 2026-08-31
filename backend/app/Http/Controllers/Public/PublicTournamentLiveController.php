<?php

namespace App\Http\Controllers\Public;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentLandingMatchResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Landing page feed of tournament matches: currently live matches (with score +
 * recent events + owning tournament) and the single next upcoming match.
 */
class PublicTournamentLiveController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $tournaments = Tournament::query()
            ->whereNull('hidden_at')
            ->whereIn('status', [
                Tournament::STATUS_IN_PROGRESS,
                Tournament::STATUS_REGISTRATION_CLOSED,
                Tournament::STATUS_OPEN_FOR_REGISTRATION,
            ])
            ->get(['id', 'slug', 'name', 'competition_id', 'season_id']);

        $pairs = $tournaments
            ->map(fn (Tournament $t) => [
                'competition_id' => $t->competition_id,
                'season_id' => $t->season_id,
                'tournament' => $t,
            ])
            ->filter(fn (array $p) => $p['competition_id'] && $p['season_id'])
            ->values();

        if ($pairs->isEmpty()) {
            return response()->json(['data' => ['live' => [], 'next' => null]]);
        }

        $lookup = [];
        foreach ($pairs as $pair) {
            $t = $pair['tournament'];
            $lookup["{$pair['competition_id']}:{$pair['season_id']}"] = [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
            ];
        }

        $scope = function ($q) use ($pairs) {
            $q->where(function ($qq) use ($pairs) {
                foreach ($pairs as $pair) {
                    $qq->orWhere(fn ($w) => $w
                        ->where('competition_id', $pair['competition_id'])
                        ->where('season_id', $pair['season_id']));
                }
            });
        };

        $live = Fixture::query()
            ->where($scope)
            ->whereHas('match', fn ($q) => $q->whereIn('status', MatchStatus::live()))
            ->with([
                'round', 'group', 'homeTeam', 'awayTeam', 'stadium',
                'match.events' => fn ($q) => $q->orderByDesc('created_at')->limit(15),
                'match.events.team', 'match.events.player', 'match.events.assistPlayer',
            ])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->limit(20)
            ->get();

        $next = Fixture::query()
            ->where($scope)
            ->where('scheduled_at', '>', now())
            ->whereNotNull('home_team_id')
            ->whereNotNull('away_team_id')
            ->where('status', FixtureStatus::Scheduled)
            ->whereDoesntHave('match', fn ($q) => $q->whereIn('status', array_merge(MatchStatus::live(), [MatchStatus::Finished])))
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->first();

        $liveData = $live
            ->map(fn (Fixture $f) => (new TournamentLandingMatchResource($f))
                ->withTournament($lookup["{$f->competition_id}:{$f->season_id}"] ?? null)
                ->toArray($request))
            ->values();

        $nextData = $next
            ? (new TournamentLandingMatchResource($next))
                ->withTournament($lookup["{$next->competition_id}:{$next->season_id}"] ?? null)
                ->toArray($request)
            : null;

        return response()->json([
            'data' => [
                'live' => $liveData,
                'next' => $nextData,
            ],
        ]);
    }
}
