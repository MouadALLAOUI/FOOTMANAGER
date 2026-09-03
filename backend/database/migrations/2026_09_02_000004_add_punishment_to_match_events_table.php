<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Round 2: consolidate card/penalty event types onto the single `foul` entry
 * point. Adds a nullable `punishment` column and converts historical
 * `yellow_card` / `second_yellow` / `red_card` rows into `type='foul'` rows
 * carrying the matching punishment. Pre-existing plain `foul` rows stay as
 * `punishment = 'none'`. Outcome events (`penalty_goal`/`missed_penalty`) and
 * the PlayerPenalty/PenaltyAward audit tables are left untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_events', function (Blueprint $table) {
            $table->string('punishment', 20)->nullable()->after('type');
        });

        // Convert standalone card events into `foul` events with a punishment.
        $conversions = [
            'yellow_card' => 'yellow',
            'second_yellow' => 'second_yellow',
            'red_card' => 'red',
        ];

        foreach ($conversions as $legacy => $punishment) {
            DB::table('match_events')
                ->where('type', $legacy)
                ->update([
                    'type' => 'foul',
                    'punishment' => $punishment,
                ]);
        }

        // Existing plain fouls are explicitly `none`.
        DB::table('match_events')
            ->where('type', 'foul')
            ->whereNull('punishment')
            ->update(['punishment' => 'none']);
    }

    public function down(): void
    {
        // Reverse the card conversions so historic types are restored exactly.
        $reversions = [
            'yellow' => 'yellow_card',
            'second_yellow' => 'second_yellow',
            'red' => 'red_card',
        ];

        foreach ($reversions as $punishment => $legacy) {
            DB::table('match_events')
                ->where('type', 'foul')
                ->where('punishment', $punishment)
                ->update(['type' => $legacy]);
        }

        Schema::table('match_events', function (Blueprint $table) {
            $table->dropColumn('punishment');
        });
    }
};