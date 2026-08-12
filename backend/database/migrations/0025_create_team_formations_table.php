<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_formations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->string('name')->default('الخطة الأساسية');
            $table->enum('format', ['5v5', '7v7', '11v11'])->nullable();
            $table->string('formation')->nullable();
            $table->json('positions')->nullable();
            $table->json('bench')->nullable();
            $table->json('substitutes')->nullable();
            $table->foreignId('captain_id')->nullable()->constrained('players')->nullOnDelete();
            $table->foreignId('vice_captain_id')->nullable()->constrained('players')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['team_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_formations');
    }
};
