<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE match_requests MODIFY COLUMN status ENUM('open','accepted','declined','completed','cancelled') NOT NULL DEFAULT 'open'");

        Schema::table('match_requests', function (Blueprint $table) {
            $table->enum('type', ['public_request', 'direct_challenge'])->default('public_request')->after('custom_terrain_name');
            $table->foreignId('target_team_id')->nullable()->after('host_team_id')->constrained('teams')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropForeign(['target_team_id']);
            $table->dropColumn(['type', 'target_team_id']);
        });

        DB::statement("ALTER TABLE match_requests MODIFY COLUMN status ENUM('open','accepted','completed','cancelled') NOT NULL DEFAULT 'open'");
    }
};
