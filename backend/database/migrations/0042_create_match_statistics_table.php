<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('match_statistics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_id')->constrained('matches')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->unsignedTinyInteger('possession')->default(0);
            $table->unsignedTinyInteger('shots')->default(0);
            $table->unsignedTinyInteger('shots_on_target')->default(0);
            $table->unsignedTinyInteger('corners')->default(0);
            $table->unsignedTinyInteger('fouls')->default(0);
            $table->unsignedTinyInteger('yellow_cards')->default(0);
            $table->unsignedTinyInteger('red_cards')->default(0);
            $table->unsignedTinyInteger('offsides')->default(0);
            $table->unsignedTinyInteger('saves')->default(0);
            $table->unsignedTinyInteger('passes')->default(0);
            $table->decimal('pass_accuracy', 5, 1)->default(0);
            $table->decimal('expected_goals', 4, 2)->nullable();
            $table->timestamps();

            $table->unique(['match_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_statistics');
    }
};
