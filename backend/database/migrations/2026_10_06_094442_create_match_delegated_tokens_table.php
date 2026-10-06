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
        Schema::create('match_delegated_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixture_id')->constrained('fixtures')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique()->index();
            $table->string('recorder_name', 120)->nullable();
            $table->string('recorder_phone', 40)->nullable();
            $table->timestamp('first_opened_at')->nullable();
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->string('status', 30)->default('active')->index(); // active, submitted, approved, rejected, revoked, expired
            $table->boolean('is_revoked')->default(false)->index();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('ip_addresses')->nullable();
            $table->timestamps();

            $table->index(['fixture_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('match_delegated_tokens');
    }
};
