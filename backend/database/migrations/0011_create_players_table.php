<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('position')->nullable();
            $table->unsignedSmallInteger('number')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('is_whatsapp')->default(false);
            $table->enum('role', ['starter', 'substitute', 'reserve'])->default('reserve');
            $table->string('preferred_position')->nullable();
            $table->enum('preferred_foot', ['left', 'right', 'both'])->nullable();
            $table->unsignedSmallInteger('height_cm')->nullable();
            $table->unsignedSmallInteger('weight_kg')->nullable();
            $table->enum('status', ['active', 'suspended', 'injured', 'unavailable'])->default('active');
            $table->string('emergency_contact')->nullable();
            $table->text('medical_notes')->nullable();
            $table->date('joined_at')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('followers_count')->default(0);
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->timestamps();

            $table->index(['team_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
