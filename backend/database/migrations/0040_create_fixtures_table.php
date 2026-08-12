<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixtures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_id')->constrained('competitions')->cascadeOnDelete();
            $table->foreignId('season_id')->nullable()->constrained('seasons')->cascadeOnDelete();
            $table->foreignId('round_id')->nullable()->constrained('rounds')->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->cascadeOnDelete();
            $table->unsignedTinyInteger('matchday')->nullable()->index();
            $table->foreignId('match_id')->nullable()->constrained('matches')->nullOnDelete();
            $table->foreignId('stadium_id')->nullable()->constrained('stadiums')->nullOnDelete();
            $table->foreignId('home_team_id')->nullable()->constrained('teams')->cascadeOnDelete();
            $table->foreignId('away_team_id')->nullable()->constrained('teams')->cascadeOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->string('status', 20)->default('scheduled')->index();
            $table->timestamps();

            $table->index(['competition_id', 'season_id', 'round_id']);
            $table->index(['home_team_id', 'status']);
            $table->index(['away_team_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixtures');
    }
};
