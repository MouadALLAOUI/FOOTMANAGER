<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_match_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_request_id')->constrained('match_requests')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->boolean('started')->default(false);
            $table->boolean('played')->default(true);
            $table->unsignedSmallInteger('minutes')->nullable();
            $table->unsignedTinyInteger('goals')->default(0);
            $table->unsignedTinyInteger('assists')->default(0);
            $table->decimal('rating', 3, 1)->nullable();
            $table->boolean('mvp')->default(false);
            $table->timestamps();

            $table->unique(['match_request_id', 'team_id', 'player_id']);
            $table->index(['team_id', 'played']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_match_players');
    }
};
