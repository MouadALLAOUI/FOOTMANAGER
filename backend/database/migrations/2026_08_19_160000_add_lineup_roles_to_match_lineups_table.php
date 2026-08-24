<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->foreignId('match_request_id')->nullable()->constrained('match_requests')->nullOnDelete()->after('match_id');
            $table->boolean('is_free_kick_taker')->default(false)->after('is_vice_captain');
            $table->index(['match_request_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->dropForeign(['match_request_id']);
            $table->dropColumn(['match_request_id', 'is_free_kick_taker']);
        });
    }
};
