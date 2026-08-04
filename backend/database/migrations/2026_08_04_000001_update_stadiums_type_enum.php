<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stadiums', function (Blueprint $table) {
            $table->enum('type', ['salle', 'synthetic', 'cement', 'minifoot', 'grass'])->default('salle')->change();
        });
    }

    public function down(): void
    {
        Schema::table('stadiums', function (Blueprint $table) {
            $table->enum('type', ['minifoot', 'salle', 'grass', 'synthetic'])->default('minifoot')->change();
        });
    }
};
