<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->string('status_reason')->nullable()->after('status');
            $table->timestamp('cancelled_at')->nullable()->after('status_reason');
            $table->foreignId('cancelled_by_team_id')
                ->nullable()
                ->after('cancelled_at')
                ->constrained('teams')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancelled_by_team_id');
            $table->dropColumn(['cancelled_at', 'status_reason']);
        });
    }
};
