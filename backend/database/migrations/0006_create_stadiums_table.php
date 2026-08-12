<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stadiums', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->nullable()->unique();
            $table->string('city');
            $table->string('address')->nullable();
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->integer('capacity')->nullable();
            $table->enum('type', ['salle', 'synthetic', 'cement', 'minifoot', 'grass'])->default('salle');
            $table->boolean('is_covered')->default(false);
            $table->string('player_format')->nullable();
            $table->boolean('has_benches')->default(false);
            $table->boolean('supports_tournaments')->default(false);
            $table->boolean('has_lighting')->default(false);
            $table->boolean('has_vestiaires')->default(false);
            $table->decimal('price_per_team', 8, 2)->nullable();
            $table->decimal('price_per_hour', 8, 2)->nullable();
            $table->decimal('total_price', 8, 2)->nullable();
            $table->boolean('is_available')->default(true);
            $table->boolean('is_open')->default(true);
            $table->string('closure_reason')->nullable();
            $table->string('google_maps_url')->nullable();
            $table->decimal('rating', 3, 2)->nullable();
            $table->unsignedInteger('reviews_count')->default(0);
            $table->string('cover_image')->nullable();
            $table->foreignId('cancellation_policy_id')->nullable()->constrained('cancellation_policies')->nullOnDelete();
            $table->unsignedInteger('followers_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stadiums');
    }
};
