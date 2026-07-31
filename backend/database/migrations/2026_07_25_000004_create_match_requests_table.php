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
            $table->foreignId('opponent_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('stadium_id')->nullable()->constrained('stadiums')->nullOnDelete();
            $table->string('custom_terrain_name')->nullable();
            $table->dateTime('match_datetime');
            $table->enum('status', ['open', 'accepted', 'completed', 'cancelled'])->default('open');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_requests');
    }
};
