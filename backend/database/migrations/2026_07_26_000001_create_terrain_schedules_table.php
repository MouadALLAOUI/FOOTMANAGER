<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terrain_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('terrain_id')->constrained('stadiums')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('slot_duration_minutes')->default(60);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['terrain_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terrain_schedules');
    }
};
