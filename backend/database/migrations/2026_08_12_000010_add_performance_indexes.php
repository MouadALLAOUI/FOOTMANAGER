<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            if (! Schema::hasIndex('terrain_bookings', ['manager_id'])) {
                $table->index('manager_id');
            }
            if (! Schema::hasIndex('terrain_bookings', ['match_request_id'])) {
                $table->index('match_request_id');
            }
        });

        Schema::table('match_requests', function (Blueprint $table) {
            if (! Schema::hasIndex('match_requests', ['stadium_id'])) {
                $table->index('stadium_id');
            }
            if (! Schema::hasIndex('match_requests', ['host_team_id'])) {
                $table->index('host_team_id');
            }
            if (! Schema::hasIndex('match_requests', ['opponent_team_id'])) {
                $table->index('opponent_team_id');
            }
            if (! Schema::hasIndex('match_requests', ['status'])) {
                $table->index('status');
            }
            if (! Schema::hasIndex('match_requests', ['match_datetime'])) {
                $table->index('match_datetime');
            }
        });

        Schema::table('stadiums', function (Blueprint $table) {
            if (! Schema::hasIndex('stadiums', ['owner_id'])) {
                $table->index('owner_id');
            }
            if (! Schema::hasIndex('stadiums', ['owner_id', 'is_available'])) {
                $table->index(['owner_id', 'is_available']);
            }
        });

        Schema::table('player_match_requests', function (Blueprint $table) {
            if (! Schema::hasIndex('player_match_requests', ['match_request_id'])) {
                $table->index('match_request_id');
            }
            if (! Schema::hasIndex('player_match_requests', ['status'])) {
                $table->index('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('terrain_bookings', function (Blueprint $table) {
            $table->dropIndex(['manager_id']);
            $table->dropIndex(['match_request_id']);
        });

        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropIndex(['stadium_id']);
            $table->dropIndex(['host_team_id']);
            $table->dropIndex(['opponent_team_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['match_datetime']);
        });

        Schema::table('stadiums', function (Blueprint $table) {
            $table->dropIndex(['owner_id']);
            $table->dropIndex(['owner_id', 'is_available']);
        });

        Schema::table('player_match_requests', function (Blueprint $table) {
            $table->dropIndex(['match_request_id']);
            $table->dropIndex(['status']);
        });
    }
};
