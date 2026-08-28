<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->integer('member_count')->default(0)->change();
            $table->enum('category', ['adult', 'teenager', 'children'])->default('adult')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->integer('member_count')->default(null)->change();
            $table->enum('category', ['adult', 'teenager', 'children'])->default(null)->nullable()->change();
        });
    }
};
