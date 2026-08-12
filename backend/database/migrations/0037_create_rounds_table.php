<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_id')->constrained('competitions')->cascadeOnDelete();
            $table->foreignId('season_id')->nullable()->constrained('seasons')->cascadeOnDelete();
            $table->string('name');
            $table->string('stage', 20)->default('group')->index();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['competition_id', 'season_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rounds');
    }
};
