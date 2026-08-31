<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->unsignedTinyInteger('half_duration_minutes')->nullable()->after('match_duration_minutes');
            $table->unsignedTinyInteger('first_half_extra_minutes')->default(0)->after('half_duration_minutes');
            $table->unsignedTinyInteger('second_half_extra_minutes')->default(0)->after('first_half_extra_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['second_half_extra_minutes', 'first_half_extra_minutes', 'half_duration_minutes']);
        });
    }
};
