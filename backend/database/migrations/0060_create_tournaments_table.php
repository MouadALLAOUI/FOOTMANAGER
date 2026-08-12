<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique()->index();
            $table->foreignId('organizer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('competition_id')->nullable()->constrained('competitions')->nullOnDelete();
            $table->foreignId('season_id')->nullable()->constrained('seasons')->nullOnDelete();
            $table->foreignId('stadium_id')->nullable()->constrained('stadiums')->nullOnDelete();
            $table->string('name');
            $table->string('edition', 60)->nullable();
            $table->string('category', 60)->nullable();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('location')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('status', 30)->default('draft')->index();
            $table->string('tournament_format', 30)->default('groups_knockout');
            $table->unsignedInteger('teams_count')->default(8);
            $table->unsignedInteger('groups_count')->default(2);
            $table->unsignedInteger('teams_per_group')->default(4);
            $table->string('group_mode', 20)->default('fixed');
            $table->unsignedInteger('match_duration_minutes')->default(90);
            $table->unsignedInteger('matches_per_day')->nullable();
            $table->unsignedInteger('knockout_teams')->nullable();
            $table->unsignedInteger('qualify_per_group')->nullable();
            $table->unsignedTinyInteger('points_for_win')->default(3);
            $table->unsignedTinyInteger('points_for_draw')->default(1);
            $table->unsignedTinyInteger('points_for_loss')->default(0);
            $table->json('qualification_rules')->nullable();
            $table->json('tiebreaker_rules')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('draw_confirmed_at')->nullable();
            $table->json('plan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
