<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_team_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('player_id');
            $table->string('team_name')->nullable();
            $table->string('status')->default('pending');
            $table->text('message')->nullable();
            $table->unsignedBigInteger('handled_by')->nullable();
            $table->timestamps();

            $table->foreign('player_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('handled_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['player_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_team_requests');
    }
};
