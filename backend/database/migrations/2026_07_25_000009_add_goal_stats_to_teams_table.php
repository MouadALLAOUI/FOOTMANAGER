<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->integer('goals_for')->default(0)->after('losses');
            $table->integer('goals_against')->default(0)->after('goals_for');
            $table->integer('goal_difference')->default(0)->after('goals_against');
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['goals_for', 'goals_against', 'goal_difference']);
        });
    }
};
