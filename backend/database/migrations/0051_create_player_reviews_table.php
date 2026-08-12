<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->unsignedTinyInteger('sportsmanship');
            $table->unsignedTinyInteger('teamwork');
            $table->unsignedTinyInteger('skill');
            $table->unsignedTinyInteger('punctuality');
            $table->text('comment')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['player_id', 'match_id']);
            $table->index(['player_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_reviews');
    }
};
