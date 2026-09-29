<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            if (! Schema::hasColumn('tournaments', 'min_players_per_team')) {
                $table->unsignedInteger('min_players_per_team')->nullable()->after('max_players_per_team');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            if (Schema::hasColumn('tournaments', 'min_players_per_team')) {
                $table->dropColumn('min_players_per_team');
            }
        });
    }
};
