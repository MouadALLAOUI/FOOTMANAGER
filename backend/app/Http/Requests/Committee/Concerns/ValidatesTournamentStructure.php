<?php

namespace App\Http\Requests\Committee\Concerns;

use Carbon\Carbon;

/**
 * Shared structural consistency rules for tournament create/update requests.
 *
 * Keeps the tournament structure free of impossible configurations
 * (capacity, group split, knockout slots, registration window).
 */
trait ValidatesTournamentStructure
{
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateStructure($validator);
        });
    }

    /**
     * Resolve the effective value for a key, falling back to the existing
     * tournament on updates so partial updates are validated consistently.
     */
    protected function effectiveValue(string $key): mixed
    {
        if ($this->has($key) && $this->input($key) !== null) {
            return $this->input($key);
        }

        return $this->route('tournament')?->getAttribute($key);
    }

    protected function validateStructure($validator): void
    {
        $format = $this->effectiveValue('tournament_format') ?: 'groups_knockout';
        $teams = (int) ($this->effectiveValue('teams_count') ?? 8);
        $groups = $this->effectiveValue('groups_count');
        $perGroup = $this->effectiveValue('teams_per_group');
        $groupMode = $this->effectiveValue('group_mode') ?? 'fixed';
        $qualify = $this->effectiveValue('qualify_per_group');
        $knockout = $this->effectiveValue('knockout_teams');

        $isGroupFormat = in_array($format, ['groups_knockout', 'groups_only'], true);
        $perGroupInt = max(2, (int) ($perGroup ?? 2));
        $effectiveGroups = $this->effectiveGroups($teams, $perGroupInt, $groups);

        // Registration window must not be reversed.
        $regStart = $this->effectiveValue('registration_start_at');
        $regEnd = $this->effectiveValue('registration_end_at');

        if ($regStart && $regEnd) {
            $start = Carbon::parse($regStart);
            $end = Carbon::parse($regEnd);

            if ($end->lt($start)) {
                $validator->errors()->add('registration_end_at', 'نهاية فترة التسجيل يجب أن تكون بعد بدايتها');
            }
        }

        if ($isGroupFormat) {
            // Teams per group are the core of the group split and always required.
            if ($perGroup === null || (int) $perGroup < 2) {
                $validator->errors()->add('teams_per_group', 'عدد الفرق في المجموعة يجب أن يكون 2 على الأقل');
            }

            // A single group cannot hold more teams than the tournament has in total.
            if ($perGroupInt > $teams) {
                $validator->errors()->add('teams_per_group', 'عدد الفرق في المجموعة يجب ألا يتجاوز العدد الكلي للفرق');
            }

            // Fixed grouping must be able to hold every team. The effective group
            // count is either the explicitly provided one or the derived value
            // (ceil(teams / teams_per_group)) so stale values never reject updates.
            if ($groupMode !== 'free') {
                $structuralInput = $this->has('teams_count')
                    || $this->has('teams_per_group')
                    || $this->has('groups_count');

                if ($structuralInput && $effectiveGroups * $perGroupInt < $teams) {
                    $validator->errors()->add('groups_count', 'عدد المجموعات غير كافٍ لاستيعاب كل الفرق');
                }
            }
        }

        // Knockout slots can never exceed the total number of teams.
        if ($knockout !== null && (int) $knockout > $teams) {
            $validator->errors()->add('knockout_teams', 'عدد فرق الإقصاء المباشر يجب ألا يتجاوز العدد الكلي للفرق');
        }

        // For groups + knockout the knockout field must match the derived value.
        if ($format === 'groups_knockout' && $qualify !== null) {
            $expected = $effectiveGroups * (int) $qualify;

            if ($expected > $teams) {
                $validator->errors()->add('qualify_per_group', 'عدد المتأهلين يجب ألا يتجاوز العدد الكلي للفرق');
            }

            if ($knockout !== null && (int) $knockout !== $expected) {
                $validator->errors()->add('knockout_teams', 'عدد فرق الإقصاء المباشر يجب أن يساوي عدد المجموعات × عدد المتأهلين');
            }
        }
    }

    /**
     * Resolve the group count used for consistency checks. An explicitly
     * provided groups_count wins; otherwise groups are derived from teams and
     * teams-per-group (ceil(teams / teams_per_group), at least 2 groups).
     * The stored value is ignored for this purpose so partial updates are not
     * rejected by a stale group count.
     */
    private function effectiveGroups(int $teams, int $perGroup, mixed $provided): int
    {
        if ($this->has('groups_count') && $provided !== null && (int) $provided >= 1) {
            return (int) $provided;
        }

        return min(max((int) ceil($teams / max(2, $perGroup)), 2), 16);
    }
}
