<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('half', 10);                      // 'first' | 'second'
            $table->unsignedTinyInteger('start_minute');     // relative to half start
            $table->unsignedSmallInteger('duration_minutes');
            $table->unsignedTinyInteger('end_minute');       // start + duration (or half-bound)
            $table->string('status', 20)->default('active'); // active | expired | ended_early
            $table->foreignId('triggered_by_event_id')->nullable()->constrained('match_events')->nullOnDelete();
            $table->timestamps();

            $table->index(['match_id', 'status']);
            $table->index(['match_id', 'team_id', 'half']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_penalties');
    }
};