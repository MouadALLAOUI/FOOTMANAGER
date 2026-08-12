<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('title');
            $table->text('message');
            $table->enum('priority', ['normal', 'important', 'urgent'])->default('normal');
            $table->enum('visibility', ['all', 'specific'])->default('all');
            $table->json('target_player_ids')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->timestamps();

            $table->index(['team_id', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_announcements');
    }
};
