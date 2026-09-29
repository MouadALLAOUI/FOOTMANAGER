<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            if (! Schema::hasColumn('fixtures', 'unscheduled_reason')) {
                $table->string('unscheduled_reason', 255)->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            if (Schema::hasColumn('fixtures', 'unscheduled_reason')) {
                $table->dropColumn('unscheduled_reason');
            }
        });
    }
};
