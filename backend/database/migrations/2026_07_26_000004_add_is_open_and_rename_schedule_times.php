<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stadiums', function (Blueprint $table) {
            $table->boolean('is_open')->default(true)->after('is_available');
            $table->string('closure_reason')->nullable()->after('is_open');
        });

        Schema::table('terrain_schedules', function (Blueprint $table) {
            $table->renameColumn('start_time', 'open_time');
            $table->renameColumn('end_time', 'close_time');
        });
    }

    public function down(): void
    {
        Schema::table('terrain_schedules', function (Blueprint $table) {
            $table->renameColumn('open_time', 'start_time');
            $table->renameColumn('close_time', 'end_time');
        });

        Schema::table('stadiums', function (Blueprint $table) {
            $table->dropColumn(['is_open', 'closure_reason']);
        });
    }
};
