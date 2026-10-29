<?php

use App\Domains\Team\Services\TeamStatisticsSyncService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            app(TeamStatisticsSyncService::class)->syncAll();
        } catch (\Throwable $e) {
            Log::warning('Team statistics sync migration notice: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
