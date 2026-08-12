<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stadium_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stadium_id')->constrained('stadiums')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('terrain_bookings')->nullOnDelete();
            $table->unsignedTinyInteger('overall_rating');
            $table->unsignedTinyInteger('field_quality');
            $table->unsignedTinyInteger('lighting');
            $table->unsignedTinyInteger('cleanliness');
            $table->unsignedTinyInteger('facilities');
            $table->unsignedTinyInteger('parking');
            $table->text('comment')->nullable();
            $table->json('photos')->nullable();
            $table->boolean('recommend')->default(true);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['user_id', 'booking_id']);
            $table->index(['stadium_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stadium_reviews');
    }
};
