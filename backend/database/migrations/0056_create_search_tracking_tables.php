<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('search_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('query', 191);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::create('search_terms', function (Blueprint $table) {
            $table->id();
            $table->string('term', 191)->unique();
            $table->unsignedInteger('count')->default(1);
            $table->timestamps();

            $table->index(['count']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_terms');
        Schema::dropIfExists('search_histories');
    }
};
