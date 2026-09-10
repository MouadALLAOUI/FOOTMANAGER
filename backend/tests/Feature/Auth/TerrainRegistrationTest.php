<?php

namespace Tests\Feature\Auth;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainImage;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Shared\Models\City;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class TerrainRegistrationTest extends TestCase
{
    use DatabaseTransactions, StreamsProgress;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('auth');
        Storage::fake('public');
    }

    public function test_terrain_owner_registration_creates_pending_user(): void
    {
        $this->section('Terrain Owner Sign-Up');
        $this->step('Registering a new terrain owner via POST /api/register-terrain-owner');

        $response = $this->postJson('/api/register-terrain-owner', [
            'name' => 'أحمد صاحب الملعب',
            'phone' => '0612345678',
            'password' => 'Password123!',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'phone' => '0612345678',
            'role' => 'terrain_owner',
            'status' => 'pending',
        ]);
        $this->note('Terrain owner created with pending status');
    }

    public function test_register_terrain_details_creates_stadium_schedules_and_bookings(): void
    {
        $this->section('Terrain Details & Bookings Setup');

        $city = City::where('slug', 'casablanca')->first()
            ?? City::firstOrCreate(['slug' => 'casablanca'], ['name' => 'الدار البيضاء']);
        $user = User::create([
            'name' => 'سعيد صاحب تيران',
            'phone' => '0698765432',
            'password' => 'SecurePass123!',
            'role' => 'terrain_owner',
            'status' => 'pending',
        ]);

        $this->step('Posting terrain details with 7-day schedule and guest booking');

        // Sample 1x1 transparent GIF as base64 data URL
        $base64Image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        $payload = [
            'phone' => $user->phone,
            'user_id' => $user->id,
            'name' => 'ملعب النجوم الخضراء',
            'city' => 'الدار البيضاء',
            'address' => 'حي الأمل شارع القدس',
            'price_per_hour' => 350,
            'open_time' => '08:00',
            'close_time' => '23:00',
            'images' => [$base64Image],
            'bookings' => [
                [
                    'date' => '2026-09-10',
                    'start_time' => '19:00',
                    'end_time' => '20:00',
                    'customer_name' => 'كريم بناني',
                    'customer_phone' => '0655443322',
                ],
            ],
        ];

        $response = $this->postJson('/api/register-terrain-details', $payload);

        $response->assertOk();
        $this->step('Verifying stadium record in database');

        $stadium = Stadium::where('owner_id', $user->id)->first();
        $this->assertNotNull($stadium);
        $this->assertEquals('ملعب النجوم الخضراء', $stadium->name);
        $this->assertEquals(350, $stadium->price_per_hour);
        $this->assertNotNull($stadium->cover_image);

        $this->step('Verifying 7 active days of TerrainSchedule');
        $schedulesCount = TerrainSchedule::where('terrain_id', $stadium->id)
            ->where('is_active', true)
            ->count();
        $this->assertEquals(7, $schedulesCount);

        $this->step('Verifying manual guest booking');
        $booking = TerrainBooking::where('terrain_id', $stadium->id)
            ->where('booking_date', '2026-09-10')
            ->where('start_time', '19:00')
            ->first();
        $this->assertNotNull($booking);
        $this->assertEquals('كريم بناني', $booking->guest_name);
        $this->assertEquals('0655443322', $booking->guest_phone);
        $this->assertEquals('approved', $booking->status);

        $this->step('Verifying stored image');
        $this->assertDatabaseHas('terrain_images', [
            'terrain_id' => $stadium->id,
        ]);
        $this->note('All stadium details, schedules, guest bookings, and images verified successfully');
    }
}
