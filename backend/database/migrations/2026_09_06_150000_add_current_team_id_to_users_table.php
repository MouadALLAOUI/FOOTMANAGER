<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('current_team_id')
                ->nullable()
                ->after('status')
                ->constrained('teams')
                ->nullOnDelete();
        });

        // Safely backfill current_team_id for existing managers from their existing managed team
        $managers = DB::table('users')
            ->where('role', 'manager')
            ->get(['id']);

        foreach ($managers as $manager) {
            $teamId = DB::table('teams')
                ->where('manager_id', $manager->id)
                ->orderBy('id', 'asc')
                ->value('id');

            if ($teamId) {
                DB::table('users')
                    ->where('id', $manager->id)
                    ->update(['current_team_id' => $teamId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_team_id');
        });
    }
};
