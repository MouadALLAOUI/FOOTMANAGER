<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchLineup;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manages the "presence confirmation" (تأكيد الحضور) log for a fixture.
 * Records are stored in match_lineups with is_starter = false and a minimal
 * footprint so they don't interfere with any existing formation data.
 */
class TournamentFixtureLineupController extends Controller
{
    use AuthorizesRequests;

    /**
     * GET  /committee/tournaments/{tournament}/fixtures/{fixture}/lineups
     *
     * Returns the list of confirmed-present players for each team.
     */
    public function index(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $match = $fixture->match;

        if (! $match) {
            return response()->json(['data' => ['home' => [], 'away' => []]]);
        }

        $lineups = MatchLineup::query()
            ->where('match_id', $match->id)
            ->whereIn('team_id', array_filter([$fixture->home_team_id, $fixture->away_team_id]))
            ->with(['player'])
            ->get();

        $home = $lineups->where('team_id', $fixture->home_team_id)
            ->map(fn ($l) => [
                'player_id'  => $l->player_id,
                'name'       => $l->player?->name,
                'number'     => $l->player?->number,
                'position'   => $l->player?->position,
                'is_starter' => (bool) $l->is_starter,
                'order_index'=> (int) $l->order_index,
                'photo_url'  => $l->player?->photo_thumbnail_url ?? $l->player?->photo_url,
            ])->values();

        $away = $lineups->where('team_id', $fixture->away_team_id)
            ->map(fn ($l) => [
                'player_id'  => $l->player_id,
                'name'       => $l->player?->name,
                'number'     => $l->player?->number,
                'position'   => $l->player?->position,
                'is_starter' => (bool) $l->is_starter,
                'order_index'=> (int) $l->order_index,
                'photo_url'  => $l->player?->photo_thumbnail_url ?? $l->player?->photo_url,
            ])->values();

        return response()->json([
            'data' => [
                'home' => $home,
                'away' => $away,
            ],
        ]);
    }

    /**
     * POST  /committee/tournaments/{tournament}/fixtures/{fixture}/lineups/confirm
     *
     * Confirm (or un-confirm) a player's presence.
     * Body: { player_id: int, team_id: int, confirmed: bool }
     */
    public function confirm(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $validated = $request->validate([
            'player_id'  => ['required', 'integer'],
            'team_id'    => ['required', 'integer'],
            'confirmed'  => ['required', 'boolean'],
            'is_starter' => ['sometimes', 'nullable', 'boolean'],
        ]);

        $playerId = (int) $validated['player_id'];
        $teamId   = (int) $validated['team_id'];
        $confirmed = (bool) $validated['confirmed'];
        $isStarter = array_key_exists('is_starter', $validated) ? (bool) $validated['is_starter'] : null;

        // Verify the player belongs to the team.
        $player = Player::query()
            ->where('id', $playerId)
            ->where('team_id', $teamId)
            ->first();

        if (! $player) {
            throw new DomainException('اللاعب غير موجود في هذا الفريق', 422);
        }

        // Verify the team is part of this fixture.
        if ($teamId !== (int) $fixture->home_team_id && $teamId !== (int) $fixture->away_team_id) {
            throw new DomainException('الفريق غير مشارك في هذه المباراة', 422);
        }

        // Ensure the fixture has a match record (create a minimal one if needed).
        $match = $fixture->match;
        if (! $match) {
            throw new DomainException('لم تبدأ المباراة بعد — لا يمكن تأكيد الحضور', 422);
        }

        if ($confirmed) {
            $attributes = [];
            if ($isStarter !== null) {
                $attributes['is_starter'] = $isStarter;
            }

            MatchLineup::query()->updateOrCreate(
                [
                    'match_id'  => $match->id,
                    'team_id'   => $teamId,
                    'player_id' => $playerId,
                ],
                $attributes
            );
        } else {
            MatchLineup::query()
                ->where('match_id', $match->id)
                ->where('team_id', $teamId)
                ->where('player_id', $playerId)
                ->delete();
        }

        return response()->json([
            'data' => [
                'player_id' => $playerId,
                'team_id'   => $teamId,
                'confirmed' => $confirmed,
            ],
            'message' => $confirmed ? 'تم تأكيد حضور اللاعب' : 'تم إلغاء تأكيد الحضور',
        ]);
    }

    private function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $tournament->competition_id !== (int) $fixture->competition_id
            || (int) $tournament->season_id !== (int) $fixture->season_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذه البطولة', 404);
        }
    }
}
