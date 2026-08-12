<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->string('type', 60);
            $table->nullableMorphs('actor');
            $table->nullableMorphs('subject');
            $table->json('data')->nullable();
            $table->string('image_url')->nullable();
            $table->timestamps();

            $table->index(['type', 'created_at']);
            $table->index(['actor_type', 'actor_id', 'created_at']);
            $table->index(['subject_type', 'subject_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
