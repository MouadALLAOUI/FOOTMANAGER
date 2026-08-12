<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_match_performances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained('teams')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->unsignedTinyInteger('minutes_played')->default(0);
            $table->decimal('rating', 3, 1)->nullable();
            $table->unsignedTinyInteger('goals')->default(0);
            $table->unsignedTinyInteger('assists')->default(0);
            $table->unsignedTinyInteger('own_goals')->default(0);
            $table->unsignedTinyInteger('yellow_cards')->default(0);
            $table->unsignedTinyInteger('red_cards')->default(0);
            $table->unsignedTinyInteger('saves')->default(0);
            $table->boolean('clean_sheet')->default(false);
            $table->boolean('mvp')->default(false);
            $table->timestamps();

            $table->unique(['match_id', 'player_id']);
            $table->index(['player_id', 'mvp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_match_performances');
    }
};
