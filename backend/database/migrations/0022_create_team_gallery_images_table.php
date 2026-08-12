<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_gallery_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('image_path');
            $table->string('caption')->nullable();
            $table->enum('category', ['training', 'matches', 'celebrations', 'team'])->default('team');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('order_index')->default(0);
            $table->boolean('is_cover')->default(false);
            $table->timestamps();

            $table->index(['team_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_gallery_images');
    }
};
