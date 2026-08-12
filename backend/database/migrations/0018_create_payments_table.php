<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('terrain_bookings')->cascadeOnDelete();
            $table->string('provider')->nullable();
            $table->string('provider_reference')->nullable();
            $table->string('reservation_reference')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('MAD');
            $table->enum('status', ['initiated', 'authorized', 'succeeded', 'failed', 'refunded'])->default('initiated');
            $table->string('payment_method')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
