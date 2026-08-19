<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournament_teams', function (Blueprint $table) {
            $table->string('payment_status', 20)->default('not_required')->after('status')->index();
        });
    }

    public function down(): void
    {
        Schema::table('tournament_teams', function (Blueprint $table) {
            $table->dropIndex(['payment_status']);
            $table->dropColumn('payment_status');
        });
    }
};
