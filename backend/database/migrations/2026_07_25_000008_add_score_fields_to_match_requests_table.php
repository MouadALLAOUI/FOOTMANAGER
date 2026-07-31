<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->unsignedSmallInteger('host_score')->nullable()->after('notes');
            $table->unsignedSmallInteger('opponent_score')->nullable()->after('host_score');
            $table->foreignId('score_submitted_by')->nullable()->after('opponent_score')->constrained('users')->nullOnDelete();
            $table->enum('score_status', ['none', 'pending_confirmation', 'confirmed', 'disputed'])->default('none')->after('score_submitted_by');
        });
    }

    public function down(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropForeign(['score_submitted_by']);
            $table->dropColumn(['host_score', 'opponent_score', 'score_submitted_by', 'score_status']);
        });
    }
};
