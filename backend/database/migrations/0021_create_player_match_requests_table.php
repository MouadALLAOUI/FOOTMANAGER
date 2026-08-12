<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_match_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('match_request_id')->constrained('match_requests')->cascadeOnDelete();
            $table->enum('type', ['apply', 'invite'])->default('apply');
            $table->enum('status', ['pending', 'accepted', 'declined', 'cancelled'])->default('pending');
            $table->string('message')->nullable();
            $table->timestamps();

            $table->unique(['player_id', 'match_request_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_match_requests');
    }
};
