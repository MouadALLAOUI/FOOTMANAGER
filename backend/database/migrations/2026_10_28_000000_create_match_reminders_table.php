<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('match_reminders');

        Schema::create('match_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('fixture_id')->nullable()->constrained('fixtures')->cascadeOnDelete();
            $table->foreignId('match_id')->nullable()->constrained('matches')->cascadeOnDelete();
            $table->string('match_title');
            $table->string('tournament_name')->nullable();
            $table->string('stadium_name')->nullable();
            $table->dateTime('kickoff_at');
            $table->dateTime('reminder_at');
            $table->string('status')->default('pending'); // pending, sent, cancelled, expired
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->string('channel')->default('all'); // all, in_app, web_push
            $table->text('error_message')->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'fixture_id'], 'user_fixture_reminder_unique');
            $table->index(['status', 'reminder_at']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_reminders');
    }
};
