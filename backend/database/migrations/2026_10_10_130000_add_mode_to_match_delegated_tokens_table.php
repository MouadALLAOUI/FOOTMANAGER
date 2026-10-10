<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('match_delegated_tokens') && ! Schema::hasColumn('match_delegated_tokens', 'mode')) {
            Schema::table('match_delegated_tokens', function (Blueprint $table) {
                $table->string('mode', 20)->default('full')->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('match_delegated_tokens') && Schema::hasColumn('match_delegated_tokens', 'mode')) {
            Schema::table('match_delegated_tokens', function (Blueprint $table) {
                $table->dropColumn('mode');
            });
        }
    }
};
