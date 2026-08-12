<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_terrain', function (Blueprint $table) {
            $table->foreignId('terrain_id')->constrained('stadiums')->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->primary(['terrain_id', 'facility_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_terrain');
    }
};
