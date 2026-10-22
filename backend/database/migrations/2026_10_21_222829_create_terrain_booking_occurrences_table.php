<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Non-destructive additive migration:
     * Tracks individual dated occurrences of weekly subscription bookings,
     * allowing a single date's occurrence to be used by a match, freed, cancelled,
     * or blocked by weather without ever mutating or cancelling the parent weekly subscription.
     */
    public function up(): void
    {
        Schema::create('terrain_booking_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('terrain_booking_id')->constrained('terrain_bookings')->cascadeOnDelete();
            $table->date('occurrence_date');
            $table->foreignId('stadium_id')->constrained('stadiums')->cascadeOnDelete();
            $table->string('start_time', 10);
            $table->string('end_time', 10);
            $table->string('status', 40)->default('active')->index();
            $table->foreignId('fixture_id')->nullable()->constrained('fixtures')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['terrain_booking_id', 'occurrence_date'], 'tb_occurrences_booking_date_unique');
            $table->index(['stadium_id', 'occurrence_date', 'status'], 'tb_occurrences_stadium_date_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terrain_booking_occurrences');
    }
};
