<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 20)->default('text');
            $table->text('message');
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_edited')->default(false);
            $table->boolean('is_system')->default(false);
            $table->string('status', 20)->default('active');
            $table->softDeletes();
            $table->timestamps();

            $table->index(['match_id', 'status', 'id']);
        });

        Schema::create('match_chat_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('last_read_message_id')->default(0);
            $table->timestamps();

            $table->unique(['match_id', 'user_id']);
        });

        Schema::create('match_chat_mutes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('muted_until')->nullable();
            $table->timestamps();

            $table->unique(['match_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_chat_mutes');
        Schema::dropIfExists('match_chat_reads');
        Schema::dropIfExists('match_chat_messages');
    }
};
