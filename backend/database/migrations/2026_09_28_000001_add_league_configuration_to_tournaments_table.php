<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Non-destructive, additive migration to support configurable League tournament format.
     */
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->unsignedTinyInteger('rest_days_minimum')
                ->nullable()
                ->default(1)
                ->after('matches_per_day');

            $table->string('league_mode', 30)
                ->nullable()
                ->default('single_round_robin')
                ->after('rest_days_minimum');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['rest_days_minimum', 'league_mode']);
        });
    }
};
