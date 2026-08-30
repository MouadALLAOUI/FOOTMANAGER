<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->string('terrain_reservation_mode', 20)
                ->default('independent')
                ->after('card_accumulation')
                ->index();
        });

        Schema::table('matches', function (Blueprint $table) {
            $table->boolean('is_confirmed')
                ->default(true)
                ->after('extra_time');
            $table->foreignId('active_reservation_id')
                ->nullable()
                ->after('is_confirmed')
                ->constrained('terrain_bookings')
                ->nullOnDelete();
        });

        // Existing tournament reservations were created as active (approved), so
        // they are considered confirmed going forward.
        \Illuminate\Support\Facades\DB::table('matches')
            ->whereNull('active_reservation_id')
            ->update(['is_confirmed' => true]);
    }

    public function down(): void
    {
        Schema::table('matches', function (Blueprint $table) {
            $table->dropForeign(['active_reservation_id']);
            $table->dropColumn(['is_confirmed', 'active_reservation_id']);
        });

        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['terrain_reservation_mode']);
        });
    }
};
