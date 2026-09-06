<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formation_presets', function (Blueprint $table) {
            $table->id();
            // null => built-in catalog preset (not editable / deletable by managers)
            $table->foreignId('team_id')->nullable()->constrained('teams')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('format', 10);
            $table->json('slots')->nullable()->comment('Structure only: [[tactical_position, x, y], ...] with normalized coordinates');
            $table->timestamps();

            $table->index('format');
            $table->index('team_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formation_presets');
    }
};