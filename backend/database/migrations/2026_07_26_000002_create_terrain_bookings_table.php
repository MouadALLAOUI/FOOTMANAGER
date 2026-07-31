<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terrain_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('terrain_id')->constrained('stadiums')->cascadeOnDelete();
            $table->foreignId('manager_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->enum('booking_type', ['match', 'training', 'private']);
            $table->foreignId('match_request_id')->nullable()->constrained('match_requests')->nullOnDelete();
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('price', 10, 2)->default(0);
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['terrain_id', 'booking_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terrain_bookings');
    }
};
