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
        // 1. Users table: track onboarding completion and step
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'onboarding_completed_at')) {
                $table->timestamp('onboarding_completed_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('users', 'onboarding_step')) {
                $table->string('onboarding_step', 50)->nullable()->default('team')->after('onboarding_completed_at');
            }
        });

        // 2. Tournament Teams table: track rule acceptance
        Schema::table('tournament_teams', function (Blueprint $table) {
            if (! Schema::hasColumn('tournament_teams', 'rules_accepted_at')) {
                $table->timestamp('rules_accepted_at')->nullable()->after('payment_status');
            }
            if (! Schema::hasColumn('tournament_teams', 'rules_accepted_by')) {
                $table->foreignId('rules_accepted_by')->nullable()->constrained('users')->nullOnDelete()->after('rules_accepted_at');
            }
            if (! Schema::hasColumn('tournament_teams', 'rules_version')) {
                $table->string('rules_version', 20)->nullable()->after('rules_accepted_by');
            }
        });

        // 3. Terrain Bookings table: allow external/manual schedules
        Schema::table('terrain_bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('terrain_bookings', 'source')) {
                $table->string('source', 30)->default('aji_nqssro')->after('reservation_type');
            }
            if (! Schema::hasColumn('terrain_bookings', 'custom_pitch_name')) {
                $table->string('custom_pitch_name', 191)->nullable()->after('source');
            }
            // Make terrain_id nullable for external manual imported bookings
            $table->unsignedBigInteger('terrain_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'onboarding_step')) {
                $table->dropColumn('onboarding_step');
            }
            if (Schema::hasColumn('users', 'onboarding_completed_at')) {
                $table->dropColumn('onboarding_completed_at');
            }
        });

        Schema::table('tournament_teams', function (Blueprint $table) {
            if (Schema::hasColumn('tournament_teams', 'rules_accepted_by')) {
                $table->dropForeign(['rules_accepted_by']);
                $table->dropColumn('rules_accepted_by');
            }
            if (Schema::hasColumn('tournament_teams', 'rules_version')) {
                $table->dropColumn('rules_version');
            }
            if (Schema::hasColumn('tournament_teams', 'rules_accepted_at')) {
                $table->dropColumn('rules_accepted_at');
            }
        });

        Schema::table('terrain_bookings', function (Blueprint $table) {
            if (Schema::hasColumn('terrain_bookings', 'custom_pitch_name')) {
                $table->dropColumn('custom_pitch_name');
            }
            if (Schema::hasColumn('terrain_bookings', 'source')) {
                $table->dropColumn('source');
            }
        });
    }
};
