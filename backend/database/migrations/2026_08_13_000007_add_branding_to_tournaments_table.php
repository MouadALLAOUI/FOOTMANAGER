<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('logo_path');
            $table->string('primary_color', 20)->nullable()->after('cover_path');
            $table->string('secondary_color', 20)->nullable()->after('primary_color');
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['secondary_color', 'primary_color', 'cover_path']);
        });
    }
};
