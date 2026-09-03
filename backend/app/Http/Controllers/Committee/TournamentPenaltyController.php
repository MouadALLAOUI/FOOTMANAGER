<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\PenaltyAward;
use App\Domains\Match\Models\PlayerPenalty;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentFoulRuleService;
use App\Domains\Tournament\Services\TournamentResultService;
use App\Http\Requests\Committee\ResolveFoulSuggestionRequest;
use App\Http\Requests\Committee\ResolvePenaltyAwardRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentPenaltyController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentFoulRuleService $foulRules,
        private readonly TournamentResultService $results,
    ) {}

    /**
     * Full foul/penalty status for the committee result modal: rules, live
     * counters, active penalties, pending awards and current suggestions.
     */
    public function status(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        return response()->json([
            'data' => $this->foulRules->status($fixture, $this->tournamentFor($fixture)),
        ]);
    }

    /**
     * Confirm or dismiss a player time-penalty suggestion.
     */
    public function player(ResolveFoulSuggestionRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $tournamentRecord = $this->tournamentFor($fixture);
        $match = $this->results->matchFor($fixture);

        $penalty = $this->foulRules->applyPlayerPenalty(
            $tournamentRecord,
            $match,
            (int) $request->validated('event_id'),
            $request->boolean('action_confirm', true),
        );

        return response()->json([
            'data' => $penalty,
            'status' => $this->foulRules->status($fixture, $tournamentRecord),
            'message' => $request->boolean('action_confirm', true) ? 'تم تسجيل عقوبة اللاعب' : 'تم تجاهل العقوبة',
        ]);
    }

    /**
     * Confirm or dismiss a team penalty-shot award suggestion.
     */
    public function award(ResolveFoulSuggestionRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $tournamentRecord = $this->tournamentFor($fixture);
        $match = $this->results->matchFor($fixture);

        $award = $this->foulRules->applyPenaltyAward(
            $tournamentRecord,
            $match,
            (int) $request->validated('event_id'),
            $request->boolean('action_confirm', true),
        );

        return response()->json([
            'data' => $award,
            'status' => $this->foulRules->status($fixture, $tournamentRecord),
            'message' => $request->boolean('action_confirm', true) ? 'تم تسجيل ركلة الجزاء' : 'تم تجاهل ركلة الجزاء',
        ]);
    }

    /**
     * Manually end an active player penalty early.
     */
    public function endPlayer(Request $request, Tournament $tournament, Fixture $fixture, PlayerPenalty $penalty): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $match = $this->matchForFixture($tournament, $fixture);

        $penalty = $this->foulRules->endPlayerPenalty($match, $penalty);

        return response()->json([
            'data' => $penalty,
            'message' => 'تم إنهاء عقوبة اللاعب',
        ]);
    }

    /**
     * Record the outcome of a pending penalty-shot award (goal / missed / saved).
     */
    public function resolveAward(ResolvePenaltyAwardRequest $request, Tournament $tournament, Fixture $fixture, PenaltyAward $award): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $match = $this->matchForFixture($tournament, $fixture);

        $award = $this->foulRules->resolveAward(
            $match,
            $award,
            $request->validated('outcome_event_id'),
            $request->validated('outcome'),
        );

        return response()->json([
            'data' => $award,
            'message' => 'تم تسجيل نتيجة ركلة الجزاء',
        ]);
    }

    /**
     * The fixture must already have a match to award/end records. Uses the same
     * creation helper as the result service's single-event path.
     */
    protected function matchForFixture(Tournament $tournament, Fixture $fixture): FootballMatch
    {
        return $this->results->matchFor($fixture);
    }

    protected function tournamentFor(Fixture $fixture): Tournament
    {
        $tournament = Tournament::query()
            ->where('competition_id', $fixture->competition_id)
            ->where('season_id', $fixture->season_id)
            ->first();

        if (! $tournament) {
            throw new DomainException('لا يمكن إيجاد البطولة المرتبطة بهذه المباراة', 404);
        }

        return $tournament;
    }

    protected function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $tournament->competition_id !== (int) $fixture->competition_id
            || (int) $tournament->season_id !== (int) $fixture->season_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذه البطولة', 404);
        }
    }
}