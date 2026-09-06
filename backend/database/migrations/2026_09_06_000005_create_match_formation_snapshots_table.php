<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_formation_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_request_id')->constrained('match_requests')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('format', 10)->nullable();
            $table->string('preset_key', 50)->nullable();
            $table->string('formation', 255)->nullable()->comment('Human readable formation label for this match');
            $table->timestamps();

            $table->unique(['match_request_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_formation_snapshots');
    }
};