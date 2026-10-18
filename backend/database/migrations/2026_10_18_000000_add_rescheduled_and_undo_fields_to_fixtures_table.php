<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive, non-destructive migration.
     * Adds rescheduling flag, slot note, and undo payload to fixtures table.
     */
    public function up(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            $table->boolean('is_rescheduled')->default(false)->after('postponed_from_date');
            $table->string('slot_note', 255)->nullable()->after('is_rescheduled');
            $table->json('last_change_payload')->nullable()->after('slot_note');
        });
    }

    public function down(): void
    {
        Schema::table('fixtures', function (Blueprint $table) {
            $table->dropColumn([
                'is_rescheduled',
                'slot_note',
                'last_change_payload',
            ]);
        });
    }
};
