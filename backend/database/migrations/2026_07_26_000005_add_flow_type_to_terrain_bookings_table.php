<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->enum('flow_type', ['amical', 'direct'])->default('direct')->after('booking_type');
        });
    }

    public function down(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->dropColumn('flow_type');
        });
    }
};
