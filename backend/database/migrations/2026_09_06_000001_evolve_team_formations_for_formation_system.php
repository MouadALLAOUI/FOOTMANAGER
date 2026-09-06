<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_id')->constrained('team_formations')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('tactical_position', 10)->nullable();
            $table->string('role', 20)->nullable();
            $table->decimal('x', 4, 3)->nullable()->comment('Normalized 0.0 - 1.0, screen independent');
            $table->decimal('y', 4, 3)->nullable()->comment('Normalized 0.0 - 1.0, screen independent');
            $table->boolean('is_starter')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['formation_id', 'player_id']);
            $table->index(['formation_id', 'is_starter']);
        });

        Schema::table('team_formations', function (Blueprint $table) {
            // Widen the legacy 5v5/7v7/11v11 enum so every format supported by
            // LineupService::startersRequired() (incl. 8v8) can be stored.
            $table->string('format', 10)->nullable()->change();
            $table->string('preset_key', 50)->nullable()->after('formation');
        });

        // Preserve any existing JSON assignments before the columns are dropped.
        $this->convertLegacyAssignments();

        // Player assignments now live in the normalized formation_players table.
        Schema::table('team_formations', function (Blueprint $table) {
            $table->dropColumn(['positions', 'bench', 'substitutes']);
        });
    }

    /**
     * Converts legacy JSON assignments (positions/bench/substitutes with a
     * 0-100 coordinate scale) into normalized formation_players rows (0.0-1.0).
     */
    private function convertLegacyAssignments(): void
    {
        $formations = DB::table('team_formations')->select('id', 'positions', 'bench', 'substitutes')->get();

        foreach ($formations as $formation) {
            $rows = [];

            foreach (collect(json_decode((string) $formation->positions, true)) as $index => $entry) {
                if (! is_array($entry) || empty($entry['player_id'])) {
                    continue;
                }

                $rows[] = [
                    'formation_id' => $formation->id,
                    'player_id' => (int) $entry['player_id'],
                    'tactical_position' => isset($entry['key']) ? mb_substr((string) $entry['key'], 0, 10) : null,
                    'role' => null,
                    'x' => isset($entry['x']) ? round(max(0, min(100, (float) $entry['x'])) / 100, 3) : null,
                    'y' => isset($entry['y']) ? round(max(0, min(100, (float) $entry['y'])) / 100, 3) : null,
                    'is_starter' => true,
                    'sort_order' => $index,
                ];
            }

            foreach (array_merge(
                (array) json_decode((string) $formation->bench, true),
                (array) json_decode((string) $formation->substitutes, true),
            ) as $index => $playerId) {
                if (! is_numeric($playerId)) {
                    continue;
                }

                $rows[] = [
                    'formation_id' => $formation->id,
                    'player_id' => (int) $playerId,
                    'tactical_position' => null,
                    'role' => null,
                    'x' => null,
                    'y' => null,
                    'is_starter' => false,
                    'sort_order' => $index,
                ];
            }

            if ($rows) {
                DB::table('formation_players')->insert($rows);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_players');

        Schema::table('team_formations', function (Blueprint $table) {
            $table->json('positions')->nullable();
            $table->json('bench')->nullable();
            $table->json('substitutes')->nullable();
            $table->dropColumn('preset_key');
        });
    }
};
