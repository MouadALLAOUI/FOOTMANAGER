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
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Landing page feed of tournament matches: currently live matches (with score +
 * recent events + owning tournament) and the scheduled upcoming matches within 7 days.
 */
class PublicTournamentLiveController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $tournaments = Tournament::query()
            ->whereNull('hidden_at')
            ->where('status', '!=', Tournament::STATUS_CANCELLED)
            ->get(['id', 'slug', 'name', 'competition_id', 'season_id', 'status']);

        $pairs = $tournaments
            ->map(fn (Tournament $t) => [
                'competition_id' => $t->competition_id,
                'season_id' => $t->season_id,
                'tournament' => $t,
            ])
            ->filter(fn (array $p) => !empty($p['competition_id']))
            ->values();

        $lookup = [];
        foreach ($tournaments as $t) {
            $data = [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
            ];
            if ($t->competition_id && $t->season_id) {
                $lookup["{$t->competition_id}:{$t->season_id}"] = $data;
            }
            if ($t->competition_id && !isset($lookup["comp:{$t->competition_id}"])) {
                $lookup["comp:{$t->competition_id}"] = $data;
            }
        }

        $scope = function ($q) use ($pairs) {
            if ($pairs->isNotEmpty()) {
                $q->where(function ($qq) use ($pairs) {
                    foreach ($pairs as $pair) {
                        $qq->orWhere(function ($w) use ($pair) {
                            $w->where('competition_id', $pair['competition_id']);
                            if (!empty($pair['season_id'])) {
                                $w->where('season_id', $pair['season_id']);
                            }
                        });
                    }
                });
            }
        };

        $live = Fixture::query()
            ->when($pairs->isNotEmpty(), $scope)
            ->whereHas('match', fn ($q) => $q->whereIn('status', MatchStatus::live()))
            ->with([
                'round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'competition',
                'match.events' => fn ($q) => $q->orderByDesc('created_at')->limit(15),
                'match.events.team', 'match.events.player', 'match.events.assistPlayer',
            ])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->limit(20)
            ->get();

        $timezone = config('app.timezone', 'Africa/Casablanca');
        $now = Carbon::now($timezone);
        $sevenDaysLater = (clone $now)->addDays(7);

        $upcoming = Fixture::query()
            ->when($pairs->isNotEmpty(), $scope)
            ->whereNotNull('home_team_id')
            ->whereNotNull('away_team_id')
            ->where('scheduled_at', '>=', (clone $now)->subHours(2))
            ->where('scheduled_at', '<=', $sevenDaysLater)
            ->where(function ($q) {
                $q->where('status', FixtureStatus::Scheduled)
                    ->orWhere('status', 'scheduled');
            })
            ->whereDoesntHave('match', fn ($q) => $q->whereIn('status', array_merge(
                MatchStatus::live(),
                [MatchStatus::Finished, MatchStatus::Cancelled, MatchStatus::Postponed]
            )))
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'competition', 'match'])
            ->orderBy('scheduled_at', 'asc')
            ->orderBy('id', 'asc')
            ->limit(50)
            ->get();

        $finished = Fixture::query()
            ->when($pairs->isNotEmpty(), $scope)
            ->whereNotNull('home_team_id')
            ->whereNotNull('away_team_id')
            ->where(function ($q) {
                $q->where('status', FixtureStatus::Played)
                    ->orWhere('status', 'played')
                    ->orWhereHas('match', fn ($mq) => $mq->where('status', MatchStatus::Finished));
            })
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'competition', 'match'])
            ->orderByDesc('scheduled_at')
            ->orderByDesc('id')
            ->limit(15)
            ->get();

        $resolveTournament = function (Fixture $f) use ($lookup) {
            return $lookup["{$f->competition_id}:{$f->season_id}"]
                ?? $lookup["comp:{$f->competition_id}"]
                ?? ($f->competition ? [
                    'id' => $f->competition->id,
                    'name' => $f->competition->name,
                    'slug' => Str::slug($f->competition->name),
                ] : null);
        };

        $liveData = $live
            ->map(fn (Fixture $f) => (new TournamentLandingMatchResource($f))
                ->withTournament($resolveTournament($f))
                ->toArray($request))
            ->values();

        $upcomingData = $upcoming
            ->map(fn (Fixture $f) => (new TournamentLandingMatchResource($f))
                ->withTournament($resolveTournament($f))
                ->toArray($request))
            ->values();

        $finishedData = $finished
            ->map(fn (Fixture $f) => (new TournamentLandingMatchResource($f))
                ->withTournament($resolveTournament($f))
                ->toArray($request))
            ->values();

        return response()->json([
            'data' => [
                'live' => $liveData,
                'next' => $upcomingData->first() ?? null,
                'upcoming' => $upcomingData,
                'finished' => $finishedData,
            ],
        ]);
    }
}
