<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->foreignId('fixture_id')
                ->nullable()
                ->after('match_request_id')
                ->constrained('fixtures')
                ->nullOnDelete()
                ->unique();
            $table->timestamp('archived_at')
                ->nullable()
                ->after('cancelled_at')
                ->index();
        });
    }

    public function down(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->dropUnique(['terrain_bookings_fixture_id_unique']);
            $table->dropForeign(['fixture_id']);
            $table->dropColumn(['fixture_id', 'archived_at']);
        });
    }
};