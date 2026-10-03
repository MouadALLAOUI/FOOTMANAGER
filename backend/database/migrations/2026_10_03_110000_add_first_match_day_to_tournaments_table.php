<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive, non-destructive migration.
     * Adds first_match_day so the organizer can pick the first scheduling day
     * independently of the tournament start_date.
     */
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->date('first_match_day')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn('first_match_day');
        });
    }
};
