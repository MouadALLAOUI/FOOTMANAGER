<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->decimal('price_per_player', 8, 2)->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropColumn('price_per_player');
        });
    }
};
