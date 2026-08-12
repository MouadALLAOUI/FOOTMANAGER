<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_match_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('match_request_id')->nullable()->constrained('match_requests')->cascadeOnDelete();
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->date('match_date')->nullable();
            $table->enum('result', ['win', 'draw', 'loss'])->nullable();
            $table->boolean('is_tournament')->default(false);
            $table->boolean('started')->default(false);
            $table->boolean('played')->default(true);
            $table->unsignedSmallInteger('minutes')->nullable();
            $table->unsignedTinyInteger('goals')->default(0);
            $table->unsignedTinyInteger('assists')->default(0);
            $table->unsignedTinyInteger('own_goals')->default(0);
            $table->unsignedTinyInteger('yellow_cards')->default(0);
            $table->unsignedTinyInteger('red_cards')->default(0);
            $table->decimal('rating', 3, 1)->nullable();
            $table->boolean('mvp')->default(false);
            $table->boolean('clean_sheet')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'match_request_id']);
            $table->index(['user_id', 'match_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_match_stats');
    }
};
