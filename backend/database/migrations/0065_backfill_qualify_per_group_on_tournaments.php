<?php

use App\Domains\Tournament\Models\Tournament;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Tournament::query()
            ->where('tournament_format', 'groups_knockout')
            ->whereNull('qualify_per_group')
            ->whereNotNull('knockout_teams')
            ->get()
            ->each(function (Tournament $tournament) {
                $groups = max(1, (int) $tournament->groups_count);
                $perGroup = max(1, (int) floor((int) $tournament->knockout_teams / $groups));

                $tournament->forceFill(['qualify_per_group' => $perGroup])->save();
            });
    }

    public function down(): void
    {
        Tournament::query()
            ->where('tournament_format', 'groups_knockout')
            ->update(['qualify_per_group' => null]);
    }
};
