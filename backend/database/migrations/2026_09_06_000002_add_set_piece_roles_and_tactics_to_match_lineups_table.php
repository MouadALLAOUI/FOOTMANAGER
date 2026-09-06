<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->boolean('is_penalty_taker')->default(false)->after('is_free_kick_taker');
            $table->boolean('is_corner_taker')->default(false)->after('is_penalty_taker');
            $table->string('tactical_position', 10)->nullable()->after('position');
            $table->string('role', 20)->nullable()->after('tactical_position');
            $table->decimal('x', 4, 3)->nullable()->after('role')->comment('Normalized 0.0 - 1.0, screen independent');
            $table->decimal('y', 4, 3)->nullable()->after('x')->comment('Normalized 0.0 - 1.0, screen independent');
        });
    }

    public function down(): void
    {
        Schema::table('match_lineups', function (Blueprint $table) {
            $table->dropColumn(['is_penalty_taker', 'is_corner_taker', 'tactical_position', 'role', 'x', 'y']);
        });
    }
};