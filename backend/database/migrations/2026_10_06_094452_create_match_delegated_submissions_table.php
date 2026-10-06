<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('match_delegated_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixture_id')->constrained('fixtures')->cascadeOnDelete();
            $table->foreignId('match_delegated_token_id')->nullable()->constrained('match_delegated_tokens')->nullOnDelete();
            $table->unsignedTinyInteger('home_score')->default(0);
            $table->unsignedTinyInteger('away_score')->default(0);
            $table->unsignedTinyInteger('home_penalties')->nullable();
            $table->unsignedTinyInteger('away_penalties')->nullable();
            $table->boolean('extra_time')->default(false);
            $table->text('notes')->nullable();
            $table->json('events')->nullable(); // Recorded goals, cards, substitutions
            $table->string('recorder_name', 120);
            $table->string('recorder_phone', 40);
            $table->string('status', 30)->default('pending')->index(); // pending, approved, rejected
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('anomalies')->nullable(); // List of triggered anomaly flags
            $table->boolean('is_disputed')->default(false)->index();
            $table->text('dispute_reason')->nullable();
            $table->foreignId('disputed_by_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('disputed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('disputed_at')->nullable();
            $table->json('client_meta')->nullable(); // IP, User Agent, submission timestamp
            $table->timestamps();

            $table->index(['fixture_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('match_delegated_submissions');
    }
};
