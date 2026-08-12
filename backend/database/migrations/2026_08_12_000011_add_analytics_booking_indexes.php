<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            // Covers the single-booking queries in overviewAnalytics / getOwnerCalendar
            // (terrain_id + reservation_type + status + booking_date range).
            if (! Schema::hasIndex('terrain_bookings', 'tb_terr_type_status_bdate')) {
                $table->index(['terrain_id', 'reservation_type', 'status', 'booking_date'], 'tb_terr_type_status_bdate');
            }
            // Covers the weekly_subscription bounded query
            // (terrain_id + reservation_type + status + start_date range).
            if (! Schema::hasIndex('terrain_bookings', 'tb_terr_type_status_sdate')) {
                $table->index(['terrain_id', 'reservation_type', 'status', 'start_date'], 'tb_terr_type_status_sdate');
            }
        });
    }

    public function down(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->dropIndex('tb_terr_type_status_bdate');
            $table->dropIndex('tb_terr_type_status_sdate');
        });
    }
};
