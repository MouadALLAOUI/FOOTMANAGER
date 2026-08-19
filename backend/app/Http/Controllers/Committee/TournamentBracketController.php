<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentBracketService;
use App\Domains\Tournament\Services\TournamentStandingsService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;

class TournamentBracketController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentBracketService $bracket,
        private readonly TournamentStandingsService $standings,
    ) {}

    public function index(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->bracket->bracket($tournament)]);
    }

    public function store(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        return response()->json(['data' => $this->bracket->generateBracket($tournament)]);
    }

    public function populate(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $qualified = $this->qualifiedTeams($tournament);

        return response()->json(['data' => $this->bracket->populateKnockout($tournament, $qualified)]);
    }

    /**
     * Idempotent recovery pass: recompute every knockout slot from its source
     * winners and refresh round states. Safe to run at any time.
     */
    public function sync(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        return response()->json(['data' => $this->bracket->progressAll($tournament)]);
    }

    /**
     * @return array<int, int>
     */
    private function qualifiedTeams(Tournament $tournament): array
    {
        $knockoutTeams = (int) $this->bracket->resolvedKnockoutTeams($tournament);

        if ($tournament->tournament_format === 'groups_knockout') {
            $standings = $this->standings->standings($tournament);
            $groups = $standings['groups'];

            if ($groups === []) {
                throw new DomainException('لا توجد مجموعات جاهزة لاستخراج المتأهلين');
            }

            $perGroup = intdiv($knockoutTeams, count($groups));

            if ($perGroup < 1) {
                throw new DomainException('عدد الفرق المتأهلة أقل من عدد المجموعات');
            }

            $qualified = [];

            foreach ($groups as $group) {
                foreach (array_slice($group['rows'], 0, $perGroup) as $row) {
                    $qualified[] = (int) $row['team_id'];
                }
            }

            if (count($qualified) !== $knockoutTeams) {
                throw new DomainException('عدد الفرق المتأهلة لا يطابق الحجم المتوقع للدور الإقصائي');
            }

            return $qualified;
        }

        $teams = $this->bracket->knockoutTeamIds($tournament);

        if (count($teams) !== $knockoutTeams) {
            throw new DomainException('عدد الفرق المسجلة لا يطابق الحجم المتوقع للدور الإقصائي');
        }

        return $teams;
    }
}
