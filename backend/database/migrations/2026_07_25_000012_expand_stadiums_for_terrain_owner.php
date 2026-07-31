<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stadiums', function (Blueprint $table) {
            $table->foreignId('owner_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->enum('type', ['minifoot', 'salle', 'grass', 'synthetic'])->default('minifoot')->after('capacity');
            $table->string('player_format')->nullable()->after('type');
            $table->boolean('has_benches')->default(false)->after('player_format');
            $table->boolean('supports_tournaments')->default(false)->after('has_benches');
            $table->boolean('has_lighting')->default(false)->after('supports_tournaments');
            $table->boolean('has_vestiaires')->default(false)->after('has_lighting');
            $table->decimal('price_per_team', 8, 2)->nullable()->after('has_vestiaires');
            $table->decimal('total_price', 8, 2)->nullable()->after('price_per_team');
            $table->boolean('is_available')->default(true)->after('total_price');
            $table->string('google_maps_url')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('stadiums', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn([
                'owner_id', 'type', 'player_format', 'has_benches',
                'supports_tournaments', 'has_lighting', 'has_vestiaires',
                'price_per_team', 'total_price', 'is_available', 'google_maps_url',
            ]);
        });
    }
};
