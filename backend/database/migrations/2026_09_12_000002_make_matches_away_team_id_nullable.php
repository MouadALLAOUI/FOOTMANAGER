<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropForeign(['away_team_id']);
        });

        // A friendly match can be started live before an opponent is confirmed,
        // so the away side is only known later.
        Schema::table('matches', function (Blueprint $table) {
            $table->foreignId('away_team_id')->nullable()->change();
            $table->foreign('away_team_id')->references('id')->on('teams')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropForeign(['away_team_id']);
            $table->foreignId('away_team_id')->nullable(false)->change();
            $table->foreign('away_team_id')->references('id')->on('teams')->cascadeOnDelete();
        });
    }
};
