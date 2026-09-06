<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_formations', function (Blueprint $table) {
            $table->foreignId('tournament_id')
                ->nullable()
                ->after('team_id')
                ->constrained('tournaments')
                ->nullOnDelete();

            $table->index(['team_id', 'tournament_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('team_formations', function (Blueprint $table) {
            $table->dropIndex(['team_id', 'tournament_id', 'is_active']);
            $table->dropConstrainedForeignId('tournament_id');
        });
    }
};
