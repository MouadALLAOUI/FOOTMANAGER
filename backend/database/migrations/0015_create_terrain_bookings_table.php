<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terrain_bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_reference')->nullable()->unique();
            $table->uuid('uuid')->nullable()->unique();
            $table->foreignId('terrain_id')->constrained('stadiums')->cascadeOnDelete();
            $table->foreignId('manager_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('cancellation_policy_id')->nullable()->constrained('cancellation_policies')->nullOnDelete();
            $table->enum('booking_type', ['match', 'training', 'private']);
            $table->enum('flow_type', ['amical', 'direct'])->default('direct');
            $table->string('reservation_type')->default('single');
            $table->unsignedTinyInteger('day_of_week')->nullable();
            $table->foreignId('match_request_id')->nullable()->constrained('match_requests')->nullOnDelete();
            $table->date('booking_date');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('price', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->nullable();
            $table->decimal('service_fee', 10, 2)->nullable();
            $table->decimal('total', 10, 2)->nullable();
            $table->boolean('payment_required')->default(true);
            $table->enum('payment_status', ['unpaid', 'pending', 'paid', 'refunded', 'failed'])->default('unpaid');
            $table->string('payment_method')->nullable();
            $table->string('payment_provider')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'approved', 'completed', 'cancelled', 'rejected', 'expired'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->decimal('refund_percentage', 5, 2)->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->string('receipt_path')->nullable();
            $table->string('qr_code_path')->nullable();
            $table->timestamps();

            $table->index(['terrain_id', 'booking_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terrain_bookings');
    }
};
