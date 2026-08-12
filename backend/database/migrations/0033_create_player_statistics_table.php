<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_statistics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('matches_played')->default(0);
            $table->unsignedInteger('wins')->default(0);
            $table->unsignedInteger('draws')->default(0);
            $table->unsignedInteger('losses')->default(0);
            $table->unsignedInteger('goals')->default(0);
            $table->unsignedInteger('assists')->default(0);
            $table->unsignedInteger('own_goals')->default(0);
            $table->unsignedInteger('yellow_cards')->default(0);
            $table->unsignedInteger('red_cards')->default(0);
            $table->unsignedInteger('clean_sheets')->default(0);
            $table->unsignedInteger('minutes_played')->default(0);
            $table->decimal('total_rating', 7, 1)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->decimal('avg_rating', 3, 1)->default(0);
            $table->decimal('best_match_rating', 3, 1)->nullable();
            $table->unsignedInteger('mvp_count')->default(0);
            $table->string('current_streak_type', 10)->nullable();
            $table->unsignedInteger('current_streak_count')->default(0);
            $table->unsignedInteger('longest_winning_streak')->default(0);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_statistics');
    }
};
