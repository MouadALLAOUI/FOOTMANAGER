<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->boolean('foul_rules_enabled')->default(false)->after('card_accumulation');

            $table->unsignedSmallInteger('player_foul_threshold')->nullable()->after('foul_rules_enabled');
            $table->unsignedSmallInteger('player_penalty_minutes')->nullable()->after('player_foul_threshold');
            $table->boolean('player_foul_repeat')->default(true)->after('player_penalty_minutes');

            $table->unsignedSmallInteger('team_foul_threshold')->nullable()->after('player_foul_repeat');
            $table->boolean('team_foul_repeat')->default(true)->after('team_foul_threshold');

            $table->string('foul_reset_scope', 10)->default('half')->after('team_foul_repeat');
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn([
                'foul_reset_scope',
                'team_foul_repeat',
                'team_foul_threshold',
                'player_foul_repeat',
                'player_penalty_minutes',
                'player_foul_threshold',
                'foul_rules_enabled',
            ]);
        });
    }
};