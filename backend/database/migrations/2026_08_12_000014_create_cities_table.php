<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Canonical name (e.g., "Casablanca")
            $table->string('name_ar')->nullable(); // Arabic name (e.g., "الدار البيضاء")
            $table->string('name_fr')->nullable(); // French name (e.g., "Casablanca")
            $table->string('name_en')->nullable(); // English name (e.g., "Casablanca")
            $table->string('slug')->unique(); // URL-friendly (e.g., "casablanca")
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'sort_order'], 'cities_active_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cities');
    }
};