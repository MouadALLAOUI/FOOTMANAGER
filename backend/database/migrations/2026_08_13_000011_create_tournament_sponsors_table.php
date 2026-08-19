<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournament_sponsors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tournament_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('logo_path')->nullable();
            $table->string('logo_thumbnail_path')->nullable();
            $table->string('link')->nullable();
            $table->string('level', 100)->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['tournament_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournament_sponsors');
    }
};
