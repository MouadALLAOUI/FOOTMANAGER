<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('player_match_requests', function (Blueprint $table) {
            $table->string('position', 30)->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('player_match_requests', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};
