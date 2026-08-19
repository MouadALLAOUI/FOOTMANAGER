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
     * Randomly distribute every registered team across the tournament groups.
     * Fixed mode guarantees no group exceeds teams_per_group; free mode tops up
     * the derived group set first. A successful auto draw is immediately
     * confirmed (draw_confirmed_at = now()).
     *
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function autoDraw(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            $this->assertNotConfirmed($tournament);
            $this->setup->buildStructure($tournament);

            if ($tournament->group_mode === 'free') {
                $this->setup->ensureGroupSet($tournament);
            }

            $groups = $this->groupsFor($tournament);

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

            $perGroup = (int) ceil($pivots->count() / $groups->count());

            if ($tournament->group_mode !== 'free'
                && $tournament->teams_per_group > 0
                && $perGroup > $tournament->teams_per_group) {
                throw new DomainException('عدد الفرق لا يتناسب مع سعة المجموعات، راجع حدود التوزيع');
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

            $this->ensureFreeNextGroup($tournament);

            $tournament->draw_confirmed_at = now();
            $tournament->save();

            return $this->summaryFor($tournament);
        });
    }

    public function resetDraw(Tournament $tournament): void
    {
        $this->assertNotConfirmed($tournament);

        TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->update(['group_id' => null, 'group_position' => null]);

        $this->ensureFreeNextGroup($tournament);

        $tournament->draw_confirmed_at = null;
        $tournament->save();
    }

    /**
     * Freeze the draw: every registered team must be placed and (in fixed mode)
     * no group may exceed its capacity. Sets draw_confirmed_at.
     *
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function confirmDraw(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            $this->setup->buildStructure($tournament);

            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get();

            if ($pivots->isEmpty()) {
                throw new DomainException('لا توجد فرق مسجلة في البطولة');
            }

            $unassigned = $pivots->whereNull('group_id');

            if ($unassigned->isNotEmpty()) {
                throw new DomainException('وزّع جميع الفرق في المجموعات قبل تأكيد القرعة');
            }

            if ($tournament->group_mode !== 'free' && $tournament->teams_per_group > 0) {
                $counts = $pivots->groupBy('group_id')->map->count();

                if ($counts->contains(fn (int $count) => $count > $tournament->teams_per_group)) {
                    throw new DomainException('عدد الفرق في المجموعة يتجاوز الحد المسموح');
                }
            }

            $tournament->draw_confirmed_at = now();
            $tournament->save();

            return $this->summaryFor($tournament);
        });
    }

    /**
     * Remove the confirmation so the draw can be edited again. Only allowed by
     * the controller while no fixtures exist yet.
     */
    public function unconfirmDraw(Tournament $tournament): void
    {
        $tournament->draw_confirmed_at = null;
        $tournament->save();
    }

    /**
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function currentDraw(Tournament $tournament, bool $hideEmptyGroups = false): array
    {
        $this->setup->buildStructure($tournament);

        if ($tournament->group_mode === 'free') {
            $this->ensureFreeNextGroup($tournament);
        }

        $groups = $this->groupsFor($tournament);

        $pivots = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->get();

        return $this->groupSummary($groups, $pivots, $hideEmptyGroups);
    }

    /**
     * Assign a registered team to a group, move it between groups, reorder it
     * within its group, or send it back to the unassigned pool (group_id = null).
     *
     * In free mode groups have no size limit and exactly one empty "next"
     * container is always kept. When $createGroup is set a brand-new group is
     * created first and the team is placed there.
     *
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function assignTeam(Tournament $tournament, int $teamId, ?int $groupId, ?int $groupPosition, bool $createGroup = false): array
    {
        return DB::transaction(function () use ($tournament, $teamId, $groupId, $groupPosition, $createGroup) {
            $this->assertNotConfirmed($tournament);
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
            $targetGroupId = $groupId;

            if ($createGroup) {
                $targetGroupId = $this->createGroup($tournament)->id;
            } elseif ($targetGroupId !== null) {
                $groups = $this->groupsFor($tournament);

                if (! $groups->contains('id', $targetGroupId)) {
                    throw new DomainException('المجموعة غير موجودة');
                }

                if ($tournament->group_mode !== 'free' && $tournament->teams_per_group > 0) {
                    $countInTarget = TournamentTeam::query()
                        ->where('tournament_id', $tournament->id)
                        ->where('status', TournamentTeam::STATUS_REGISTERED)
                        ->where('group_id', $targetGroupId)
                        ->where('team_id', '!=', $teamId)
                        ->count();

                    if ($countInTarget >= $tournament->teams_per_group) {
                        throw new DomainException('المجموعة مكتملة، اختر مجموعة أخرى');
                    }
                }
            }

            $pivot->forceFill(['group_id' => null, 'group_position' => null])->save();
            $this->compactGroup($tournament, $oldGroupId);

            if ($targetGroupId === null) {
                $this->ensureFreeNextGroup($tournament);

                return $this->summaryFor($tournament);
            }

            if (! $this->groupsFor($tournament)->contains('id', $targetGroupId)) {
                throw new DomainException('المجموعة غير موجودة');
            }

            $members = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->where('group_id', $targetGroupId)
                ->orderBy('group_position')
                ->get();

            $position = $groupPosition === null
                ? $members->max('group_position') + 1
                : max(1, $groupPosition);

            TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->where('group_id', $targetGroupId)
                ->where('group_position', '>=', $position)
                ->increment('group_position');

            $pivot->forceFill(['group_id' => $targetGroupId, 'group_position' => $position])->save();

            $this->ensureFreeNextGroup($tournament);

            return $this->summaryFor($tournament);
        });
    }

    /**
     * Persist the whole board state in a single atomic write. The request is
     * authoritative: every registered team must be listed and receives exactly
     * the group (or pool) it appears in; positions are renumbered server-side.
     *
     * In free mode new groups are sent as keys (e.g. ["new-1"]) and are created
     * before the assignments referencing them are applied. Exactly one empty
     * "next" container is kept afterwards.
     *
     * @param  array<int, array{team_id: int, group_id?: int|string|null, group_position?: int|null}>  $assignments
     * @param  array<int, string>  $newGroupKeys
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    public function saveDraw(Tournament $tournament, array $assignments, array $newGroupKeys = []): array
    {
        return DB::transaction(function () use ($tournament, $assignments, $newGroupKeys) {
            $this->assertNotConfirmed($tournament);
            $this->setup->buildStructure($tournament);

            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get()
                ->keyBy('team_id');

            if ($pivots->isEmpty()) {
                throw new DomainException('لا توجد فرق مسجلة في البطولة');
            }

            $keyToGroupId = [];
            foreach (array_unique(array_values(array_filter($newGroupKeys))) as $key) {
                $keyToGroupId[(string) $key] = $this->createGroup($tournament)->id;
            }

            $groups = $this->groupsFor($tournament);
            $validGroupIds = $groups->pluck('id')->flip();

            $resolved = [];
            $seen = [];

            foreach ($assignments as $assignment) {
                $teamId = (int) ($assignment['team_id'] ?? 0);
                $raw = $assignment['group_id'] ?? null;
                $groupId = null;

                if ($raw !== null && $raw !== '') {
                    if (is_numeric($raw)) {
                        $groupId = (int) $raw;
                    } else {
                        if (! isset($keyToGroupId[(string) $raw])) {
                            throw new DomainException('المجموعة المطلوبة غير موجودة');
                        }
                        $groupId = $keyToGroupId[(string) $raw];
                    }
                }

                if (! $pivots->has($teamId)) {
                    throw new DomainException('الفريق غير مسجل في البطولة');
                }

                if (isset($seen[$teamId])) {
                    throw new DomainException('لا يمكن تكرار نفس الفريق في القرعة');
                }
                $seen[$teamId] = true;

                if ($groupId !== null && ! $validGroupIds->has($groupId)) {
                    throw new DomainException('المجموعة غير موجودة');
                }

                $resolved[] = [
                    'team_id' => $teamId,
                    'group_id' => $groupId,
                    'group_position' => $assignment['group_position'] ?? null,
                ];
            }

            if ($tournament->group_mode !== 'free' && $tournament->teams_per_group > 0) {
                $counts = [];

                foreach ($resolved as $item) {
                    if ($item['group_id'] === null) {
                        continue;
                    }
                    $counts[$item['group_id']] = ($counts[$item['group_id']] ?? 0) + 1;
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

            foreach ($resolved as $item) {
                if ($item['group_id'] === null) {
                    continue;
                }

                $pivots->get($item['team_id'])->forceFill([
                    'group_id' => $item['group_id'],
                    'group_position' => $item['group_position'] !== null
                        ? (int) $item['group_position']
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

            $this->ensureFreeNextGroup($tournament);

            return $this->summaryFor($tournament);
        });
    }

    private function summaryFor(Tournament $tournament): array
    {
        return $this->groupSummary(
            $this->groupsFor($tournament),
            TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->get(),
        );
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

    private function createGroup(Tournament $tournament): Group
    {
        $season = $this->setup->ensureSeason($tournament);
        $groupRound = $this->setup->ensureGroupRound($tournament, $season);
        $competitionId = $tournament->competition_id;

        $existing = Group::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $season->id)
            ->get();

        $usedNames = $existing->pluck('name')->flip();
        $index = $existing->count() + 1;

        do {
            $name = $this->setup->groupLabel($index++);
        } while ($usedNames->has($name));

        return Group::create([
            'competition_id' => $competitionId,
            'season_id' => $season->id,
            'round_id' => $groupRound->id,
            'name' => $name,
        ]);
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

    private function assertNotConfirmed(Tournament $tournament): void
    {
        if ($tournament->draw_confirmed_at !== null) {
            throw new DomainException('القرعة مؤكدة، افتحها أولاً لتعديل التوزيع');
        }
    }

    /**
     * Free-mode invariant: exactly one empty group (the "next" container) must
     * always exist so the committee always has a place to drop the next team.
     * Extra empty groups are removed; when none is empty a new one is created.
     */
    private function ensureFreeNextGroup(Tournament $tournament): void
    {
        if ($tournament->group_mode !== 'free') {
            return;
        }

        $groupIds = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->orderBy('name')
            ->pluck('id');

        if ($groupIds->isEmpty()) {
            $this->createGroup($tournament);

            return;
        }

        $memberGroupIds = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->whereIn('group_id', $groupIds)
            ->pluck('group_id')
            ->flip();

        $emptyIds = $groupIds->reject(fn ($id) => $memberGroupIds->has($id));

        if ($emptyIds->isEmpty()) {
            $this->createGroup($tournament);

            return;
        }

        if ($emptyIds->count() > 1) {
            Group::whereKey($emptyIds->slice(1)->values()->all())->delete();
        }
    }

    /**
     * @param  Collection<int, Group>  $groups
     * @param  Collection<int, TournamentTeam>  $pivots
     * @return array<int, array{group_id: int, name: string, team_count: int}>
     */
    private function groupSummary(Collection $groups, Collection $pivots, bool $onlyNonEmpty = false): array
    {
        return $groups
            ->map(fn (Group $group) => [
                'group_id' => $group->id,
                'name' => $group->name,
                'team_count' => $pivots->where('group_id', $group->id)->count(),
            ])
            ->when($onlyNonEmpty, fn (Collection $items) => $items->filter(fn (array $group) => $group['team_count'] > 0))
            ->values()
            ->all();
    }
}
