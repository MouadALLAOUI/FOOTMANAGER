<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_lineups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('position', 30)->nullable();
            $table->unsignedTinyInteger('shirt_number')->nullable();
            $table->boolean('is_starter')->default(false);
            $table->boolean('is_captain')->default(false);
            $table->boolean('is_vice_captain')->default(false);
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->unique(['match_id', 'team_id', 'player_id']);
            $table->index(['match_id', 'is_starter']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_lineups');
    }
};
