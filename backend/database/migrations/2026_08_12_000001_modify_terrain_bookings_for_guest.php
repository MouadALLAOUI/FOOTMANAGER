<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
  {
    Schema::table('terrain_bookings', function (Blueprint $table) {
      // Make manager_id and team_id nullable to allow guest bookings
      $table->unsignedBigInteger('manager_id')->nullable()->change();
      $table->unsignedBigInteger('team_id')->nullable()->change();

      // Add guest fields
      $table->string('guest_name')->nullable()->after('team_id');
      $table->string('guest_phone')->nullable()->after('guest_name');
      $table->string('guest_email')->nullable()->after('guest_phone');
    });
  }

  public function down(): void
  {
    Schema::table('terrain_bookings', function (Blueprint $table) {
      $table->unsignedBigInteger('manager_id')->change();
      $table->unsignedBigInteger('team_id')->change();

      $table->dropColumn(['guest_name', 'guest_phone', 'guest_email']);
    });
  }
};
