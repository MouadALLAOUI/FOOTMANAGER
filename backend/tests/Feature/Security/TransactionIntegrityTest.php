<?php

namespace Tests\Feature\Security;

use App\Domains\Booking\Models\CancellationPolicy;
use App\Domains\Booking\Models\CancellationRequest;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class TransactionIntegrityTest extends TestCase
{
    use RefreshDatabase, StreamsProgress;

    protected User $manager;
    protected User $owner;
    protected Stadium $terrain;
    protected CancellationPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->section('setting up test data');

        $this->manager = User::factory()->approved()->create(['role' => 'manager']);
        $this->owner = User::factory()->approved()->terrainOwner()->create();

        $this->policy = CancellationPolicy::create([
            'name' => 'Flexible',
            'slug' => 'flexible',
            'hours_before' => 24,
            'refund_percentage' => 50,
            'is_active' => true,
        ]);

        $this->terrain = Stadium::create([
            'owner_id' => $this->owner->id,
            'name' => 'Test Stadium',
            'city' => 'Casablanca',
            'is_open' => true,
            'is_available' => true,
            'price_per_team' => 100,
            'cancellation_policy_id' => $this->policy->id,
        ]);

        $this->team = $this->manager->team()->create([
            'name' => 'Test Team',
            'city' => 'Casablanca',
        ]);

        // Create working hours for the terrain (Sunday=0)
        TerrainSchedule::create([
            'terrain_id' => $this->terrain->id,
            'day_of_week' => now()->dayOfWeek,
            'open_time' => '08:00',
            'close_time' => '23:00',
            'slot_duration_minutes' => 60,
            'is_active' => true,
        ]);
    }

    // ───────────────────────────────────────────
    // A. PUT /me — password change requires current_password
    // ───────────────────────────────────────────

    public function test_update_profile_rejects_password_change_without_current_password(): void
    {
        $this->section('PUT /me without current_password is rejected');

        Sanctum::actingAs($this->manager);

        $res = $this->putJson('/api/me', [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $res->assertUnprocessable();
        $res->assertJsonValidationErrors('current_password');
    }

    public function test_update_profile_rejects_password_change_with_wrong_current_password(): void
    {
        $this->section('PUT /me with wrong current_password is rejected');

        Sanctum::actingAs($this->manager);

        $res = $this->putJson('/api/me', [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'current_password' => 'wrongpassword',
        ]);

        $res->assertUnprocessable();
        $res->assertJsonValidationErrors('current_password');
    }

    public function test_update_profile_accepts_password_change_with_correct_current_password(): void
    {
        $this->section('PUT /me with correct current_password succeeds');

        Sanctum::actingAs($this->manager);

        $res = $this->putJson('/api/me', [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'current_password' => 'password',
        ]);

        $res->assertOk();
        $res->assertJsonStructure(['message', 'user']);
    }

    public function test_update_profile_name_change_does_not_require_current_password(): void
    {
        $this->section('PUT /me name-only update does not require current_password');

        Sanctum::actingAs($this->manager);

        $res = $this->putJson('/api/me', [
            'name' => 'Updated Name',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('users', ['id' => $this->manager->id, 'name' => 'Updated Name']);
    }

    // ───────────────────────────────────────────
    // B. OwnerBookingController — cancellation refund consistency
    // ───────────────────────────────────────────

    public function test_owner_approving_cancellation_applies_refund_policy(): void
    {
        $this->section('owner approval computes refund from cancellation policy');

        $futureDate = now()->addDays(3)->toDateString();
        $booking = TerrainBooking::create([
            'terrain_id' => $this->terrain->id,
            'manager_id' => $this->manager->id,
            'team_id' => $this->team->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $futureDate,
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => 100,
            'subtotal' => 100,
            'service_fee' => 0,
            'total' => 100,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'cancellation_policy_id' => $this->policy->id,
        ]);

        $cancellationRequest = CancellationRequest::create([
            'terrain_booking_id' => $booking->id,
            'user_id' => $this->manager->id,
            'reason' => 'Schedule conflict',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->putJson("/api/owner/cancellation-requests/{$cancellationRequest->id}", [
            'action' => 'approve',
        ]);

        $res->assertOk();

        $booking->refresh();
        $this->assertEquals('cancelled', $booking->status);
        $this->assertNotNull($booking->cancelled_at);
        $this->assertEquals(50, $booking->refund_percentage);
        $this->assertEquals(50.0, (float) $booking->refund_amount);

        $cancellationRequest->refresh();
        $this->assertEquals('approved', $cancellationRequest->status);
    }

    public function test_owner_rejecting_cancellation_does_not_modify_booking(): void
    {
        $this->section('owner rejection leaves booking intact');

        $booking = TerrainBooking::create([
            'terrain_id' => $this->terrain->id,
            'manager_id' => $this->manager->id,
            'team_id' => $this->team->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => now()->addDays(3)->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => 100,
            'subtotal' => 100,
            'service_fee' => 0,
            'total' => 100,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'cancellation_policy_id' => $this->policy->id,
        ]);

        $cancellationRequest = CancellationRequest::create([
            'terrain_booking_id' => $booking->id,
            'user_id' => $this->manager->id,
            'reason' => 'Schedule conflict',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->putJson("/api/owner/cancellation-requests/{$cancellationRequest->id}", [
            'action' => 'reject',
        ]);

        $res->assertOk();

        $booking->refresh();
        $this->assertEquals('confirmed', $booking->status);
        $this->assertNull($booking->cancelled_at);

        $cancellationRequest->refresh();
        $this->assertEquals('rejected', $cancellationRequest->status);
    }

    public function test_owner_cannot_approve_already_handled_cancellation(): void
    {
        $this->section('double-approval is rejected');

        $booking = TerrainBooking::create([
            'terrain_id' => $this->terrain->id,
            'manager_id' => $this->manager->id,
            'team_id' => $this->team->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => now()->addDays(3)->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => 100,
            'subtotal' => 100,
            'service_fee' => 0,
            'total' => 100,
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'cancellation_policy_id' => $this->policy->id,
        ]);

        $cancellationRequest = CancellationRequest::create([
            'terrain_booking_id' => $booking->id,
            'user_id' => $this->manager->id,
            'reason' => 'Schedule conflict',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->putJson("/api/owner/cancellation-requests/{$cancellationRequest->id}", [
            'action' => 'approve',
        ]);

        $res->assertStatus(422);
    }

    public function test_owner_approving_cancellation_updates_payment_status_for_paid_booking(): void
    {
        $this->section('paid booking gets refunded status on cancellation approval');

        $booking = TerrainBooking::create([
            'terrain_id' => $this->terrain->id,
            'manager_id' => $this->manager->id,
            'team_id' => $this->team->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => now()->addDays(3)->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => 100,
            'subtotal' => 100,
            'service_fee' => 0,
            'total' => 100,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'cancellation_policy_id' => $this->policy->id,
        ]);

        $cancellationRequest = CancellationRequest::create([
            'terrain_booking_id' => $booking->id,
            'user_id' => $this->manager->id,
            'reason' => 'Schedule conflict',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->putJson("/api/owner/cancellation-requests/{$cancellationRequest->id}", [
            'action' => 'approve',
        ]);

        $res->assertOk();

        $booking->refresh();
        $this->assertEquals('refunded', $booking->payment_status);
    }

    // ───────────────────────────────────────────
    // C. SlotClosureController — transactional integrity
    // ───────────────────────────────────────────

    public function test_slot_closure_prevents_overlapping_closures(): void
    {
        $this->section('overlapping closure is rejected');

        $closureDate = now()->toDateString();

        TerrainSlotClosure::create([
            'terrain_id' => $this->terrain->id,
            'closure_date' => $closureDate,
            'start_time' => '10:00',
            'end_time' => '12:00',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->postJson("/api/owner/terrains/{$this->terrain->id}/slot-closures", [
            'closure_date' => $closureDate,
            'start_time' => '11:00',
            'end_time' => '13:00',
        ]);

        $res->assertStatus(422);
        $this->assertDatabaseCount('terrain_slot_closures', 1);
    }

    public function test_slot_closure_blocks_existing_booking(): void
    {
        $this->section('closure overlapping a booking is rejected');

        $futureDate = now()->addDays(2)->toDateString();

        TerrainBooking::create([
            'terrain_id' => $this->terrain->id,
            'manager_id' => $this->manager->id,
            'team_id' => $this->team->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $futureDate,
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => 100,
            'subtotal' => 100,
            'service_fee' => 0,
            'total' => 100,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->postJson("/api/owner/terrains/{$this->terrain->id}/slot-closures", [
            'closure_date' => $futureDate,
            'start_time' => '09:00',
            'end_time' => '12:00',
        ]);

        $res->assertStatus(422);
        $this->assertDatabaseCount('terrain_slot_closures', 0);
    }

    public function test_slot_closure_outside_working_hours_is_rejected(): void
    {
        $this->section('closure outside schedule hours is rejected');

        Sanctum::actingAs($this->owner);

        $res = $this->postJson("/api/owner/terrains/{$this->terrain->id}/slot-closures", [
            'closure_date' => now()->toDateString(),
            'start_time' => '06:00',
            'end_time' => '07:00',
        ]);

        $res->assertStatus(422);
        $this->assertDatabaseCount('terrain_slot_closures', 0);
    }

    public function test_slot_closure_non_overlapping_succeeds(): void
    {
        $this->section('non-overlapping closure is accepted');

        $closureDate = now()->toDateString();

        TerrainSlotClosure::create([
            'terrain_id' => $this->terrain->id,
            'closure_date' => $closureDate,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        Sanctum::actingAs($this->owner);

        $res = $this->postJson("/api/owner/terrains/{$this->terrain->id}/slot-closures", [
            'closure_date' => $closureDate,
            'start_time' => '14:00',
            'end_time' => '15:00',
        ]);

        $res->assertCreated();
        $this->assertDatabaseCount('terrain_slot_closures', 2);
    }

    // ───────────────────────────────────────────
    // D. BookingService — duplicate booking prevention
    // ───────────────────────────────────────────

    public function test_booking_conflict_detection_prevents_double_booking(): void
    {
        $this->section('booking conflict prevents same-slot reservation');

        $futureDate = now()->addDays(5)->toDateString();

        // First booking succeeds via service directly
        $service = new \App\Domains\Booking\Services\BookingService();
        $booking1 = $service->confirm($this->manager, [
            'terrain_id' => $this->terrain->id,
            'booking_type' => 'match',
            'booking_date' => $futureDate,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        $this->assertNotNull($booking1);
        $this->assertEquals('pending', $booking1->status);

        // Second booking on same slot should throw ConflictHttpException
        $this->expectException(\Symfony\Component\HttpKernel\Exception\ConflictHttpException::class);
        $service->confirm($this->manager, [
            'terrain_id' => $this->terrain->id,
            'booking_type' => 'match',
            'booking_date' => $futureDate,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
    }

    public function test_booking_rejects_past_time_slot(): void
    {
        $this->section('past time slot is rejected');

        $service = new \App\Domains\Booking\Services\BookingService();

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->confirm($this->manager, [
            'terrain_id' => $this->terrain->id,
            'booking_type' => 'match',
            'booking_date' => now()->subDay()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
    }

    public function test_booking_rejects_closed_terrain(): void
    {
        $this->section('closed terrain is rejected');

        $this->terrain->update(['is_open' => false]);

        $service = new \App\Domains\Booking\Services\BookingService();

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->confirm($this->manager, [
            'terrain_id' => $this->terrain->id,
            'booking_type' => 'match',
            'booking_date' => now()->addDays(5)->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
    }

    public function test_booking_rejects_slot_conflicting_with_closure(): void
    {
        $this->section('booking into a closed slot is rejected');

        $closureDate = now()->addDays(4)->toDateString();

        TerrainSlotClosure::create([
            'terrain_id' => $this->terrain->id,
            'closure_date' => $closureDate,
            'start_time' => '09:00',
            'end_time' => '12:00',
            'reason' => 'Maintenance',
        ]);

        $service = new \App\Domains\Booking\Services\BookingService();

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->confirm($this->manager, [
            'terrain_id' => $this->terrain->id,
            'booking_type' => 'match',
            'booking_date' => $closureDate,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);
    }

    // ───────────────────────────────────────────
    // E. Cross-role isolation for owner endpoints
    // ───────────────────────────────────────────

    public function test_manager_cannot_access_terrain_owner_cancellation_endpoint(): void
    {
        $this->section('manager cannot approve/reject cancellation as owner');

        Sanctum::actingAs($this->manager);

        $res = $this->putJson('/api/owner/cancellation-requests/1', [
            'action' => 'approve',
        ]);

        $res->assertForbidden();
    }

    public function test_manager_cannot_access_terrain_owner_slot_closure_endpoint(): void
    {
        $this->section('manager cannot create slot closures as owner');

        Sanctum::actingAs($this->manager);

        $res = $this->postJson("/api/owner/terrains/{$this->terrain->id}/slot-closures", [
            'closure_date' => now()->addDays(1)->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        $res->assertForbidden();
    }
}
