<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->dropForeign(['match_id']);
        });

        // A lineup row now belongs to either a live match or a match request
        // (pre-match formation planning), so match_id must be nullable.
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->foreignId('match_id')->nullable()->change();
            $table->foreign('match_id')->references('id')->on('matches')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->dropForeign(['match_id']);
            $table->foreignId('match_id')->nullable(false)->change();
            $table->foreign('match_id')->references('id')->on('matches')->cascadeOnDelete();
        });
    }
};
