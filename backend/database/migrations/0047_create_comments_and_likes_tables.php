<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->nullableMorphs('commentable');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->text('body');
            $table->string('status', 20)->default('active');
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_edited')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('comments')->cascadeOnDelete();
            $table->index(['commentable_type', 'commentable_id', 'status', 'created_at']);
            $table->index(['commentable_type', 'commentable_id', 'status', 'is_pinned']);
        });

        Schema::create('comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained('comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['comment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_likes');
        Schema::dropIfExists('comments');
    }
};
