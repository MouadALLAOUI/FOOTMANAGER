<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('matches', 'public_token')) {
            Schema::table('matches', function (Blueprint $table) {
                $table->string('public_token', 64)->nullable()->unique()->after('uuid');
            });
        }

        // Generate tokens for existing matches safely without breaking current records
        DB::table('matches')->whereNull('public_token')->chunkById(100, function ($matches) {
            foreach ($matches as $match) {
                DB::table('matches')
                    ->where('id', $match->id)
                    ->update(['public_token' => Str::random(32)]);
            }
        });

        // Add index on match_events (match_id, updated_at) if table exists and index doesn't
        if (Schema::hasTable('match_events')) {
            Schema::table('match_events', function (Blueprint $table) {
                $table->index(['match_id', 'updated_at'], 'match_events_match_id_updated_at_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('match_events')) {
            Schema::table('match_events', function (Blueprint $table) {
                $table->dropIndex('match_events_match_id_updated_at_idx');
            });
        }

        if (Schema::hasColumn('matches', 'public_token')) {
            Schema::table('matches', function (Blueprint $table) {
                $table->dropColumn('public_token');
            });
        }
    }
};
