<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->boolean('needs_players')->default(false);
            $table->unsignedSmallInteger('players_needed')->nullable();
            $table->timestamp('started_at')->nullable();
        });

        Schema::table('match_requests', function (Blueprint $table) {
            $table->enum('status', ['open', 'accepted', 'declined', 'completed', 'cancelled', 'live'])
                ->default('open')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropColumn(['needs_players', 'players_needed', 'started_at']);

            $table->enum('status', ['open', 'accepted', 'declined', 'completed', 'cancelled'])
                ->default('open')
                ->change();
        });
    }
};
