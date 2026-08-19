<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->timestamp('registration_start_at')->nullable()->after('end_date');
            $table->timestamp('registration_end_at')->nullable()->after('registration_start_at');
            $table->decimal('registration_fee', 10, 2)->nullable()->default(0)->after('registration_end_at');
        });

        DB::table('tournaments')
            ->where('status', 'published')
            ->update(['status' => 'open_for_registration']);

        DB::table('tournaments')
            ->where('status', 'finished')
            ->update(['status' => 'completed']);
    }

    public function down(): void
    {
        DB::table('tournaments')
            ->where('status', 'open_for_registration')
            ->update(['status' => 'published']);

        DB::table('tournaments')
            ->where('status', 'completed')
            ->update(['status' => 'finished']);

        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['registration_start_at', 'registration_end_at', 'registration_fee']);
        });
    }
};
