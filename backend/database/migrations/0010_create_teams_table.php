<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('is_free')->default(false);
            $table->integer('member_count')->default(0);
            $table->enum('category', ['adult', 'teenager', 'children'])->default('adult');
            $table->string('level')->nullable();
            $table->string('association_name')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('cover_image_path')->nullable();
            $table->string('city')->nullable();
            $table->unsignedSmallInteger('founded_year')->nullable();
            $table->unsignedSmallInteger('max_squad_size')->default(30);
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->json('preferred_formats')->nullable();
            $table->json('social_links')->nullable();
            $table->string('region')->nullable();
            $table->text('description')->nullable();
            $table->string('primary_color')->nullable();
            $table->string('secondary_color')->nullable();
            $table->foreignId('primary_stadium_id')->nullable()->constrained('stadiums')->nullOnDelete();
            $table->integer('points')->default(0);
            $table->integer('matches_played')->default(0);
            $table->integer('wins')->default(0);
            $table->integer('draws')->default(0);
            $table->integer('losses')->default(0);
            $table->integer('goals_for')->default(0);
            $table->integer('goals_against')->default(0);
            $table->integer('goal_difference')->default(0);
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('captain_id')->nullable();
            $table->unsignedBigInteger('vice_captain_id')->nullable();
            $table->unsignedInteger('followers_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
