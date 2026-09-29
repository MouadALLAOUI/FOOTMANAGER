<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->unsignedInteger('teams_per_group')->nullable()->change();
            $table->string('group_mode', 20)->nullable()->change();
        });

        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->time('end_time')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->unsignedInteger('teams_per_group')->nullable(false)->default(4)->change();
            $table->string('group_mode', 20)->nullable(false)->default('fixed')->change();
        });

        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->time('end_time')->nullable(false)->change();
        });
    }
};
