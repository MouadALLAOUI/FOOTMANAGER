<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_gallery_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('image_path');
            $table->enum('category', ['training', 'matches', 'awards', 'profile', 'cover'])->default('training');
            $table->string('caption', 255)->nullable();
            $table->boolean('is_cover')->default(false);
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_gallery_images');
    }
};
