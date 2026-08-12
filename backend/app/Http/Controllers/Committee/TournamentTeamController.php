<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Domains\Tournament\Resources\TournamentTeamResource;
use App\Http\Requests\Committee\AddTournamentTeamsRequest;
use App\Http\Requests\Committee\CreateFreeTeamRequest;
use App\Http\Requests\Committee\MoveTournamentTeamsRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class TournamentTeamController extends Controller
{
    use AuthorizesRequests;

    public function index(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $teams = $tournament->tournamentTeams()
            ->with(['team', 'group'])
            ->get();

        return TournamentTeamResource::collection($teams);
    }

    public function store(AddTournamentTeamsRequest $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $this->assertEditable($tournament);

        DB::transaction(function () use ($request, $tournament) {
            foreach ($request->input('team_ids') as $teamId) {
                TournamentTeam::query()->firstOrCreate(
                    ['tournament_id' => $tournament->id, 'team_id' => $teamId],
                    ['status' => TournamentTeam::STATUS_REGISTERED],
                );
            }
        });

        $teams = $tournament->tournamentTeams()
            ->with(['team', 'group'])
            ->get();

        return TournamentTeamResource::collection($teams);
    }

    public function storeFree(CreateFreeTeamRequest $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $this->assertEditable($tournament);

        $team = Team::query()->create([
            'name' => $request->input('name'),
            'is_free' => true,
        ]);

        TournamentTeam::query()->firstOrCreate(
            ['tournament_id' => $tournament->id, 'team_id' => $team->id],
            ['status' => TournamentTeam::STATUS_REGISTERED],
        );

        $teams = $tournament->tournamentTeams()
            ->with(['team', 'group'])
            ->get();

        return TournamentTeamResource::collection($teams);
    }

    public function assignGroup(MoveTournamentTeamsRequest $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $this->assertEditable($tournament);

        $groupId = (int) $request->input('group_id');
        $teamIds = array_map('intval', $request->input('team_ids'));

        $group = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->find($groupId);

        if (! $group) {
            throw new DomainException('المجموعة غير موجودة');
        }

        DB::transaction(function () use ($tournament, $groupId, $teamIds) {
            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->whereIn('team_id', $teamIds)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get();

            if ($tournament->group_mode !== 'free' && $tournament->teams_per_group > 0) {
                $alreadyInGroup = $pivots->where('group_id', $groupId)->count();
                $countInTarget = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('status', TournamentTeam::STATUS_REGISTERED)
                    ->where('group_id', $groupId)
                    ->whereNotIn('team_id', $teamIds)
                    ->count();

                if ($countInTarget + $alreadyInGroup > $tournament->teams_per_group) {
                    throw new DomainException('عدد الفرق في المجموعة يتجاوز الحد المسموح');
                }
            }

            $sourceGroupIds = $pivots->pluck('group_id')->filter()->unique()->values()->all();

            $pivots->each->forceFill(['group_id' => $groupId, 'group_position' => null])->save();

            foreach (array_unique([$groupId, ...$sourceGroupIds]) as $gid) {
                $this->renumberGroup($tournament, $gid);
            }
        });

        $teams = $tournament->tournamentTeams()
            ->with(['team', 'group'])
            ->get();

        return TournamentTeamResource::collection($teams);
    }

    private function renumberGroup(Tournament $tournament, int $groupId): void
    {
        TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->where('group_id', $groupId)
            ->orderBy('group_position')
            ->orderBy('id')
            ->get()
            ->values()
            ->each(function (TournamentTeam $pivot, int $index) {
                $pivot->forceFill(['group_position' => $index + 1])->save();
            });
    }

    public function destroy(Tournament $tournament, int $teamId): Response
    {
        $this->authorize('manage', $tournament);

        $this->assertEditable($tournament);

        if ($tournament->fixtures()->whereNotNull('home_team_id')->where('home_team_id', $teamId)->exists()
            || $tournament->fixtures()->whereNotNull('away_team_id')->where('away_team_id', $teamId)->exists()) {
            throw new DomainException('لا يمكن إزالة فريق له مباريات مجدولة');
        }

        TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $teamId)
            ->delete();

        return response()->noContent();
    }

    private function assertEditable(Tournament $tournament): void
    {
        if (! in_array($tournament->status, ['draft', 'published'], true)) {
            throw new DomainException('لا يمكن تعديل الفرق بعد انطلاق البطولة');
        }

        $groupFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('group_id')
            ->count();

        if ($groupFixtures > 0) {
            throw new DomainException('لا يمكن تعديل الفرق بعد إنشاء برنامج المباريات');
        }
    }
}
