<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->unique();
            $table->enum('position', ['goalkeeper', 'defender', 'midfielder', 'forward'])->nullable();
            $table->json('secondary_positions')->nullable();
            $table->json('preferred_formats')->nullable();
            $table->enum('skill_level', ['beginner', 'amateur', 'semi_pro', 'pro'])->nullable();
            $table->unsignedSmallInteger('birth_year')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('nationality', 100)->nullable();
            $table->unsignedSmallInteger('height_cm')->nullable();
            $table->unsignedSmallInteger('weight_kg')->nullable();
            $table->enum('preferred_foot', ['left', 'right', 'both'])->nullable();
            $table->enum('strong_foot', ['left', 'right', 'both'])->nullable();
            $table->string('city')->nullable();
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('cover_photo_path')->nullable();
            $table->boolean('is_available')->default(true);
            $table->enum('availability_status', ['available', 'busy', 'vacation', 'injured', 'unavailable'])->default('available');
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->enum('contact_visibility', ['public', 'team', 'private'])->default('private');
            $table->boolean('recruitment_available')->default(true);
            $table->string('language', 10)->default('ar');
            $table->json('notification_preferences')->nullable();
            $table->json('preferred_playing_days')->nullable();
            $table->json('preferred_playing_hours')->nullable();
            $table->json('preferred_cities')->nullable();
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('matches_played')->default(0);
            $table->unsignedInteger('wins')->default(0);
            $table->unsignedInteger('draws')->default(0);
            $table->unsignedInteger('losses')->default(0);
            $table->decimal('rating', 3, 1)->default(0);
            $table->decimal('overall_rating', 4, 1)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_profiles');
    }
};
