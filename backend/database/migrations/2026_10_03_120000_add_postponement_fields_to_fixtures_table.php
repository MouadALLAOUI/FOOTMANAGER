<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive, non-destructive migration.
     * Adds postponement fields to fixtures table so individual match postponement reasons
     * and previous match timing can be tracked.
     */
    public function up(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            $table->string('postponement_reason', 50)->nullable()->after('unscheduled_reason');
            $table->text('postponement_note')->nullable()->after('postponement_reason');
            $table->dateTime('postponed_from_date')->nullable()->after('postponement_note');
        });
    }

    public function down(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            $table->dropColumn([
                'postponement_reason',
                'postponement_note',
                'postponed_from_date',
            ]);
        });
    }
};
