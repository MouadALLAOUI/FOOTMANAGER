<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_schedules', function (Blueprint $table) {
            // Covers schedule lookups by terrain + day + active status (overviewAnalytics, getOwnerCalendar, getTerrainSlots)
            if (! Schema::hasIndex('terrain_schedules', 'ts_terr_dow_active')) {
                $table->index(['terrain_id', 'day_of_week', 'is_active'], 'ts_terr_dow_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('terrain_schedules', function (Blueprint $table) {
            $table->dropIndex('ts_terr_dow_active');
        });
    }
};