<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->string('reservation_type')->default('single')->after('booking_type');
            $table->unsignedTinyInteger('day_of_week')->nullable()->after('reservation_type');
            $table->date('start_date')->nullable()->after('booking_date');
            $table->date('end_date')->nullable()->after('start_date');
        });
    }

    public function down(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->dropColumn(['reservation_type', 'day_of_week', 'start_date', 'end_date']);
        });
    }
};
