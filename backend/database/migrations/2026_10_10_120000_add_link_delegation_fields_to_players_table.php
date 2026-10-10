<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->boolean('added_via_link')->default(false)->after('notes');
            $table->unsignedBigInteger('added_via_token_id')->nullable()->after('added_via_link');
            $table->unsignedBigInteger('added_via_fixture_id')->nullable()->after('added_via_token_id');
            $table->boolean('link_reviewed')->default(false)->after('added_via_fixture_id');
            $table->boolean('is_locked_from_delegates')->default(false)->after('link_reviewed');
            $table->string('added_by_recorder_name')->nullable()->after('is_locked_from_delegates');
            $table->string('added_by_recorder_phone')->nullable()->after('added_by_recorder_name');

            $table->index('added_via_token_id');
            $table->index('added_via_fixture_id');
            $table->foreign('added_via_token_id')->references('id')->on('match_delegated_tokens')->nullOnDelete();
            $table->foreign('added_via_fixture_id')->references('id')->on('fixtures')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropForeign(['added_via_token_id']);
            $table->dropForeign(['added_via_fixture_id']);
            $table->dropColumn([
                'added_via_link',
                'added_via_token_id',
                'added_via_fixture_id',
                'link_reviewed',
                'is_locked_from_delegates',
                'added_by_recorder_name',
                'added_by_recorder_phone',
            ]);
        });
    }
};
