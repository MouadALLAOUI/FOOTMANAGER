<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Models\Group;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentDrawService
{
    public function __construct(
        private readonly TournamentSetupService $setup,
    ) {}

    /**
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function autoDraw(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            $this->setup->buildStructure($tournament);

            $groups = Group::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->orderBy('name')
                ->get();

            if ($groups->isEmpty()) {
                throw new DomainException('لا يمكن تنفيذ القرعة قبل إنشاء المجموعات');
            }

            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get();

            if ($pivots->count() < $groups->count()) {
                throw new DomainException('عدد الفرق المسجلة أقل من عدد المجموعات');
            }

            foreach ($pivots as $pivot) {
                $pivot->forceFill(['group_id' => null, 'group_position' => null])->save();
            }

            $teams = $pivots->shuffle()->values();
            $groupList = $groups->values();

            foreach ($teams as $index => $pivot) {
                $group = $groupList[$index % $groupList->count()];

                $pivot->forceFill([
                    'group_id' => $group->id,
                    'group_position' => intdiv($index, $groupList->count()) + 1,
                ])->save();
            }

            $tournament->draw_confirmed_at = now();
            $tournament->save();

            return $this->groupSummary($groups, $pivots);
        });
    }

    public function resetDraw(Tournament $tournament): void
    {
        TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->update(['group_id' => null, 'group_position' => null]);

        $tournament->draw_confirmed_at = null;
        $tournament->save();
    }

    /**
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function currentDraw(Tournament $tournament): array
    {
        $this->setup->buildStructure($tournament);

        $groups = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->orderBy('name')
            ->get();

        $pivots = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->get();

        return $this->groupSummary($groups, $pivots);
    }

    /**
     * Assign a registered team to a group, move it between groups, reorder it
     * within its group, or send it back to the unassigned pool (group_id = null).
     *
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function assignTeam(Tournament $tournament, int $teamId, ?int $groupId, ?int $groupPosition): array
    {
        return DB::transaction(function () use ($tournament, $teamId, $groupId, $groupPosition) {
            $this->setup->buildStructure($tournament);

            $pivot = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $teamId)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->first();

            if (! $pivot) {
                throw new DomainException('الفريق غير مسجل في البطولة');
            }

            $oldGroupId = $pivot->group_id;

            if ($groupId === null) {
                $pivot->forceFill(['group_id' => null, 'group_position' => null])->save();
                $this->compactGroup($tournament, $oldGroupId);
                $this->touchDrawState($tournament);

                return $this->groupSummary(
                    $this->groupsFor($tournament),
                    TournamentTeam::query()
                        ->where('tournament_id', $tournament->id)
                        ->where('status', TournamentTeam::STATUS_REGISTERED)
                        ->get(),
                );
            }

            $groups = $this->groupsFor($tournament);

            if (! $groups->contains('id', $groupId)) {
                throw new DomainException('المجموعة غير موجودة');
            }

            if ($tournament->group_mode !== 'free' && $tournament->teams_per_group > 0) {
                $countInTarget = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('status', TournamentTeam::STATUS_REGISTERED)
                    ->where('group_id', $groupId)
                    ->where('team_id', '!=', $teamId)
                    ->count();

                if ($countInTarget >= $tournament->teams_per_group) {
                    throw new DomainException('المجموعة مكتملة، اختر مجموعة أخرى');
                }
            }

            $pivot->forceFill(['group_id' => null, 'group_position' => null])->save();
            $this->compactGroup($tournament, $oldGroupId);

            $members = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->where('group_id', $groupId)
                ->orderBy('group_position')
                ->get();

            $position = $groupPosition === null
                ? $members->max('group_position') + 1
                : max(1, $groupPosition);

            TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->where('group_id', $groupId)
                ->where('group_position', '>=', $position)
                ->increment('group_position');

            $pivot->forceFill(['group_id' => $groupId, 'group_position' => $position])->save();

            $this->touchDrawState($tournament);

            return $this->groupSummary($this->groupsFor($tournament), TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get());
        });
    }

    /**
     * Persist the whole board state in a single atomic write. The request is
     * authoritative: every registered team must be listed and receives exactly
     * the group (or pool) it appears in; positions are renumbered server-side.
     *
     * @param  array<int, array{team_id: int, group_id?: int|null, group_position?: int|null}>  $assignments
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function saveDraw(Tournament $tournament, array $assignments): array
    {
        return DB::transaction(function () use ($tournament, $assignments) {
            $this->setup->buildStructure($tournament);

            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get()
                ->keyBy('team_id');

            if ($pivots->isEmpty()) {
                throw new DomainException('لا توجد فرق مسجلة في البطولة');
            }

            $groups = $this->groupsFor($tournament);

            foreach ($assignments as $assignment) {
                $teamId = (int) ($assignment['team_id'] ?? 0);
                $groupId = isset($assignment['group_id']) && $assignment['group_id'] !== null
                    ? (int) $assignment['group_id']
                    : null;

                if (! $pivots->has($teamId)) {
                    throw new DomainException('الفريق غير مسجل في البطولة');
                }

                if ($groupId !== null && ! $groups->contains('id', $groupId)) {
                    throw new DomainException('المجموعة غير موجودة');
                }
            }

            if ($tournament->group_mode !== 'free' && $tournament->teams_per_group > 0) {
                $counts = [];

                foreach ($assignments as $assignment) {
                    $groupId = isset($assignment['group_id']) && $assignment['group_id'] !== null
                        ? (int) $assignment['group_id']
                        : null;

                    if ($groupId === null) {
                        continue;
                    }

                    $counts[$groupId] = ($counts[$groupId] ?? 0) + 1;
                }

                foreach ($counts as $groupId => $count) {
                    if ($count > $tournament->teams_per_group) {
                        throw new DomainException('عدد الفرق في المجموعة يتجاوز الحد المسموح');
                    }
                }
            }

            TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->update(['group_id' => null, 'group_position' => null]);

            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get()
                ->keyBy('team_id');

            foreach ($assignments as $assignment) {
                $teamId = (int) ($assignment['team_id'] ?? 0);
                $groupId = isset($assignment['group_id']) && $assignment['group_id'] !== null
                    ? (int) $assignment['group_id']
                    : null;

                if ($groupId === null) {
                    continue;
                }

                $pivots->get($teamId)->forceFill([
                    'group_id' => $groupId,
                    'group_position' => isset($assignment['group_position']) && $assignment['group_position'] !== null
                        ? (int) $assignment['group_position']
                        : null,
                ])->save();
            }

            foreach ($groups as $group) {
                $members = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('status', TournamentTeam::STATUS_REGISTERED)
                    ->where('group_id', $group->id)
                    ->orderBy('group_position')
                    ->orderBy('id')
                    ->get();

                $position = 1;

                foreach ($members as $member) {
                    $member->forceFill(['group_position' => $position++])->save();
                }
            }

            $this->touchDrawState($tournament);

            return $this->groupSummary($groups, TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get());
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Group>
     */
    private function groupsFor(Tournament $tournament)
    {
        return Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->orderBy('name')
            ->get();
    }

    private function compactGroup(Tournament $tournament, ?int $groupId): void
    {
        if ($groupId === null) {
            return;
        }

        $members = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->where('group_id', $groupId)
            ->orderBy('group_position')
            ->get();

        $position = 1;
        foreach ($members as $member) {
            $member->forceFill(['group_position' => $position++])->save();
        }
    }

    private function touchDrawState(Tournament $tournament): void
    {
        $hasAssigned = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->whereNotNull('group_id')
            ->exists();

        $tournament->draw_confirmed_at = $hasAssigned ? now() : null;
        $tournament->save();
    }

    /**
     * @param  Collection<int, Group>  $groups
     * @param  Collection<int, TournamentTeam>  $pivots
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    private function groupSummary(Collection $groups, Collection $pivots): array
    {
        return $groups->map(fn (Group $group) => [
            'group_id' => $group->id,
            'name' => $group->name,
            'team_count' => $pivots->where('group_id', $group->id)->count(),
        ])->values()->all();
    }
}
