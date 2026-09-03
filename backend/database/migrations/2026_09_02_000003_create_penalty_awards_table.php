<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penalty_awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('awarded_to_team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('committing_team_id')->constrained('teams')->cascadeOnDelete();
            $table->unsignedSmallInteger('triggering_foul_count');
            $table->string('half', 10);
            $table->unsignedTinyInteger('minute');           // relative to half start
            $table->string('status', 20)->default('awarded'); // awarded | converted | missed | saved | voided
            $table->foreignId('outcome_event_id')->nullable()->constrained('match_events')->nullOnDelete();
            $table->foreignId('triggered_by_event_id')->nullable()->constrained('match_events')->nullOnDelete();
            $table->timestamps();

            $table->index(['match_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penalty_awards');
    }
};