<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_events', function (Blueprint $table) {
            $table->string('half', 10)->nullable()->after('added_time')->index();
        });

        // Backfill `half` from the loose `period` value where present, otherwise
        // derive it from the minute (default 45-minute halves heuristic).
        DB::table('match_events')->whereNotNull('period')->update([
            'half' => DB::raw("CASE
                WHEN period LIKE '%first%' THEN 'first'
                WHEN period LIKE '%second%' THEN 'second'
                ELSE NULL
            END"),
        ]);

        DB::table('match_events')
            ->whereNull('half')
            ->where('minute', '>', 45)
            ->update(['half' => 'second']);

        DB::table('match_events')
            ->whereNull('half')
            ->where('minute', '<=', 45)
            ->update(['half' => 'first']);
    }

    public function down(): void
    {
        Schema::table('match_events', function (Blueprint $table) {
            $table->dropColumn('half');
        });
    }
};
