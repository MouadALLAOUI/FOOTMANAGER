<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('activity_locked')->default(false);
            $table->text('activity_lock_reason')->nullable();
            $table->unsignedBigInteger('activity_locked_by')->nullable();
            $table->timestamp('activity_locked_at')->nullable();

            $table->foreign('activity_locked_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['activity_locked_by']);
            $table->dropColumn([
                'activity_locked',
                'activity_lock_reason',
                'activity_locked_by',
                'activity_locked_at',
            ]);
        });
    }
};
