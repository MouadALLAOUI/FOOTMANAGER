<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('match_request_id')->nullable()->constrained('match_requests')->nullOnDelete();
            $table->date('session_date')->nullable();
            $table->enum('status', ['present', 'absent', 'late', 'excused'])->default('present');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['match_request_id', 'player_id']);
            $table->unique(['session_date', 'player_id']);
            $table->index(['team_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
