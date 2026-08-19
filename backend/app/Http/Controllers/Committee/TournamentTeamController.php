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

    public function registrations(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $registrations = $tournament->allRegistrations()
            ->with(['team', 'group'])
            ->latest()
            ->get();

        return TournamentTeamResource::collection($registrations);
    }

    public function store(AddTournamentTeamsRequest $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $this->assertEditable($tournament);

        $teamIds = array_map('intval', $request->input('team_ids'));

        DB::transaction(function () use ($tournament, $teamIds) {
            $tournament = Tournament::query()->lockForUpdate()->findOrFail($tournament->id);

            $existing = $tournament->allRegistrations()
                ->whereIn('team_id', $teamIds)
                ->pluck('team_id');

            $newIds = array_values(array_diff($teamIds, $existing->all()));

            $this->assertCapacity($tournament, count($newIds));

            foreach ($newIds as $teamId) {
                TournamentTeam::query()->create([
                    'tournament_id' => $tournament->id,
                    'team_id' => $teamId,
                    'status' => TournamentTeam::STATUS_REGISTERED,
                ]);
            }
        });

        return $this->teamCollection($tournament);
    }

    public function storeFree(CreateFreeTeamRequest $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $this->assertEditable($tournament);

        DB::transaction(function () use ($request, $tournament) {
            $tournament = Tournament::query()->lockForUpdate()->findOrFail($tournament->id);

            $this->assertCapacity($tournament, 1);

            $team = Team::query()->create([
                'name' => $request->input('name'),
                'is_free' => true,
            ]);

            TournamentTeam::query()->create([
                'tournament_id' => $tournament->id,
                'team_id' => $team->id,
                'status' => TournamentTeam::STATUS_REGISTERED,
            ]);
        });

        return $this->teamCollection($tournament);
    }

    public function approve(Tournament $tournament, int $teamId): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        DB::transaction(function () use ($tournament, $teamId) {
            $tournament = Tournament::query()->lockForUpdate()->findOrFail($tournament->id);

            $registration = $this->findRegistration($tournament, $teamId, TournamentTeam::STATUS_PENDING);

            $this->assertCapacity($tournament, 1);

            $registration->forceFill(['status' => TournamentTeam::STATUS_REGISTERED])->save();
        });

        return $this->teamCollection($tournament);
    }

    public function reject(Tournament $tournament, int $teamId): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $registration = $this->findRegistration($tournament, $teamId, TournamentTeam::STATUS_PENDING);

        $registration->forceFill(['status' => TournamentTeam::STATUS_REJECTED])->save();

        return $this->teamCollection($tournament);
    }

    public function markPaid(Tournament $tournament, int $teamId): AnonymousResourceCollection
    {
        $this->authorize('manage', $tournament);

        $registration = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $teamId)
            ->first();

        if (! $registration || $registration->payment_status !== TournamentTeam::PAYMENT_PENDING) {
            throw new DomainException('لا يوجد دفع معلق لهذا الفريق');
        }

        $registration->forceFill(['payment_status' => TournamentTeam::PAYMENT_COMPLETED])->save();

        return $this->teamCollection($tournament);
    }

    private function findRegistration(Tournament $tournament, int $teamId, string $status): TournamentTeam
    {
        $registration = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $teamId)
            ->where('status', $status)
            ->first();

        if (! $registration) {
            throw new DomainException('لا يوجد طلب تسجيل بهذه الحالة');
        }

        return $registration;
    }

    private function teamCollection(Tournament $tournament): AnonymousResourceCollection
    {
        return TournamentTeamResource::collection(
            $tournament->tournamentTeams()->with(['team', 'group'])->get(),
        );
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
        if (! $tournament->isEditable()) {
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

    private function assertCapacity(Tournament $tournament, int $additional): void
    {
        if ($tournament->teams_count <= 0) {
            return;
        }

        $registered = $tournament->registeredTeamsCount();

        if ($registered + $additional > $tournament->teams_count) {
            throw new DomainException(
                "تجاوزت سعة البطولة: المسجل {$registered} من أصل {$tournament->teams_count}",
            );
        }
    }
}
