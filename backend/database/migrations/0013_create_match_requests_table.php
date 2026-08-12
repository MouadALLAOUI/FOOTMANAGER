<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('host_team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('target_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('opponent_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('mercenary_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('stadium_id')->nullable()->constrained('stadiums')->nullOnDelete();
            $table->string('custom_terrain_name')->nullable();
            $table->enum('type', ['public_request', 'direct_challenge'])->default('public_request');
            $table->dateTime('match_datetime');
            $table->enum('status', ['open', 'accepted', 'declined', 'completed', 'cancelled'])->default('open');
            $table->text('notes')->nullable();
            $table->unsignedSmallInteger('host_score')->nullable();
            $table->unsignedSmallInteger('opponent_score')->nullable();
            $table->foreignId('score_submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('score_status', ['none', 'pending_confirmation', 'confirmed', 'disputed'])->default('none');
            $table->decimal('price_per_player', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_requests');
    }
};
