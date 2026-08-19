<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rounds', function (Blueprint $table) {
            $table->string('status', 20)->default('in_progress')->after('order_index');
        });

        DB::table('rounds')->where('stage', '<>', 'group')->update(['status' => 'locked']);

        Schema::table('fixtures', function (Blueprint $table) {
            $table->foreignId('source_home_fixture_id')
                ->nullable()
                ->after('away_team_id')
                ->constrained('fixtures')
                ->nullOnDelete();
            $table->foreignId('source_away_fixture_id')
                ->nullable()
                ->after('source_home_fixture_id')
                ->constrained('fixtures')
                ->nullOnDelete();
        });

        $this->backfillBracketSources();
    }

    /**
     * Wire explicit source relationships between consecutive knockout rounds for
     * brackets that already exist. Fixture j in round r+1 feeds from fixtures
     * 2j and 2j+1 of round r (standard halving bracket).
     */
    private function backfillBracketSources(): void
    {
        $competitions = DB::table('rounds')
            ->where('stage', '<>', 'group')
            ->distinct()
            ->get(['competition_id', 'season_id']);

        foreach ($competitions as $pair) {
            $rounds = DB::table('rounds')
                ->where('competition_id', $pair->competition_id)
                ->where('season_id', $pair->season_id)
                ->where('stage', '<>', 'group')
                ->orderBy('order_index')
                ->get();

            if ($rounds->count() < 2) {
                continue;
            }

            $fixturesByRound = [];

            foreach ($rounds as $round) {
                $fixturesByRound[$round->id] = DB::table('fixtures')
                    ->where('round_id', $round->id)
                    ->orderBy('id')
                    ->pluck('id')
                    ->all();
            }

            for ($i = 1; $i < $rounds->count(); $i++) {
                $previous = $fixturesByRound[$rounds[$i - 1]->id];
                $current = $fixturesByRound[$rounds[$i]->id];

                foreach ($current as $index => $fixtureId) {
                    DB::table('fixtures')->where('id', $fixtureId)->update([
                        'source_home_fixture_id' => $previous[$index * 2] ?? null,
                        'source_away_fixture_id' => $previous[$index * 2 + 1] ?? null,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_home_fixture_id');
            $table->dropConstrainedForeignId('source_away_fixture_id');
        });

        Schema::table('rounds', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
