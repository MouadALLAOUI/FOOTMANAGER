<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('feature_id')->constrained()->cascadeOnDelete();
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('value')->nullable();
            $table->boolean('is_unlimited')->default(false);
            $table->timestamps();

            $table->unique(['plan_id', 'feature_id']);
            $table->index('feature_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_features');
    }
};
