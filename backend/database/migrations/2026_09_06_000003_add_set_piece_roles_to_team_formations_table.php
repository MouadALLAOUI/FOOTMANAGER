<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_formations', function (Blueprint $table) {
            $table->foreignId('free_kick_taker_id')->nullable()->after('vice_captain_id')->constrained('players')->nullOnDelete();
            $table->foreignId('penalty_taker_id')->nullable()->after('free_kick_taker_id')->constrained('players')->nullOnDelete();
            $table->foreignId('corner_taker_id')->nullable()->after('penalty_taker_id')->constrained('players')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('team_formations', function (Blueprint $table) {
            $table->dropForeign(['free_kick_taker_id', 'penalty_taker_id', 'corner_taker_id']);
            $table->dropColumn(['free_kick_taker_id', 'penalty_taker_id', 'corner_taker_id']);
        });
    }
};