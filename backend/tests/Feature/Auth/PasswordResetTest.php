<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase, StreamsProgress;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('auth');
        RateLimiter::clear('password');
        Notification::fake();
    }

    private function createUser(string $email = 'manager@test.com', ?string $phone = '0600000001'): User
    {
        return User::create([
            'name' => 'Test Manager',
            'email' => $email,
            'phone' => $phone,
            'role' => 'manager',
            'status' => 'approved',
            'password' => 'OldPassword123!',
        ]);
    }

    private function captureToken(User $user): string
    {
        $rawToken = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $n) use (&$rawToken): bool {
            $rawToken = $n->token;
            return true;
        });
        $this->assertNotEmpty($rawToken, 'No reset notification was sent to the user');
        return $rawToken;
    }

    public function test_request_reset_returns_generic_response_and_sends_notification(): void
    {
        $this->section('requesting a reset link');
        $this->createUser();

        $this->step('POST /api/forgot-password with existing account');
        $res = $this->postJson('/api/forgot-password', ['login' => 'manager@test.com']);
        $res->assertOk()->assertJsonStructure(['message']);
        $this->note('generic message: '.$res->json('message'));

        $this->step('POST /api/forgot-password with unknown identity — identical response');
        $unknown = $this->postJson('/api/forgot-password', ['login' => 'ghost@nowhere.com']);
        $unknown->assertOk();
        $this->assertSame($res->json('message'), $unknown->json('message'));

        $this->step('notification sent exactly once for the real account only');
        Notification::assertSentTo(
            User::where('email', 'manager@test.com')->first(),
            ResetPasswordNotification::class,
            1,
        );
    }

    public function test_valid_token_resets_password(): void
    {
        $this->section('full reset with a valid token');
        $user = $this->createUser();

        $this->step('requesting the reset link');
        $this->postJson('/api/forgot-password', ['login' => $user->email])->assertOk();
        $token = $this->captureToken($user);

        $this->step('validate-token endpoint confirms validity without consuming it');
        $check = $this->postJson('/api/forgot-password/validate-token', [
            'login' => $user->email,
            'token' => $token,
        ]);
        $check->assertOk()->assertJson(['valid' => true]);

        $this->step('setting the new password');
        $res = $this->postJson('/api/reset-password', [
            'token' => $token,
            'login' => $user->email,
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ]);
        $res->assertOk();

        $this->step('password actually changed');
        $this->assertTrue(Hash::check('NewPassword456!', $user->fresh()->password));

        $this->step('token row deleted after use (single-use)');
        $this->assertSame(0, DB::table('password_reset_tokens')->where('email', $user->email)->count());
    }

    public function test_phone_identity_can_reset(): void
    {
        $this->section('reset via phone number identity');
        $user = $this->createUser(email: 'byphone@test.com', phone: '0612345678');

        $this->step('requesting via phone');
        $this->postJson('/api/forgot-password', ['login' => '0612345678'])->assertOk();
        $token = $this->captureToken($user);

        $this->step('resetting via phone');
        $res = $this->postJson('/api/reset-password', [
            'token' => $token,
            'login' => '0612345678',
            'password' => 'PhoneReset789!',
            'password_confirmation' => 'PhoneReset789!',
        ]);

        $res->assertOk();
        $this->assertTrue(Hash::check('PhoneReset789!', $user->fresh()->password));
    }

    public function test_invalid_token_is_rejected_generically(): void
    {
        $this->section('invalid token handling');
        $user = $this->createUser();

        $this->step('attempting reset with a fabricated token');
        $res = $this->postJson('/api/reset-password', [
            'token' => str_repeat('a', 64),
            'login' => $user->email,
            'password' => 'Whatever123!',
            'password_confirmation' => 'Whatever123!',
        ]);

        $res->assertStatus(422);
        $this->assertFalse(Hash::check('Whatever123!', $user->fresh()->password));

        $this->step('validate-token reports invalid for unknown account too');
        $check = $this->postJson('/api/forgot-password/validate-token', [
            'login' => 'ghost@nowhere.com',
            'token' => str_repeat('b', 64),
        ]);
        $check->assertOk()->assertJson(['valid' => false]);
    }

    public function test_expired_token_is_rejected(): void
    {
        $this->section('expired token handling');
        $user = $this->createUser();

        $this->step('creating then ageing the token beyond expiry (61+ min)');
        $this->postJson('/api/forgot-password', ['login' => $user->email])->assertOk();
        $token = $this->captureToken($user);

        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update(['created_at' => now()->subMinutes((int) config('auth.passwords.users.expire') + 5)]);

        $res = $this->postJson('/api/reset-password', [
            'token' => $token,
            'login' => $user->email,
            'password' => 'Expired999!',
            'password_confirmation' => 'Expired999!',
        ]);

        $res->assertStatus(422);
        $this->assertFalse(Hash::check('Expired999!', $user->fresh()->password));
    }

    public function test_reused_token_cannot_be_used_twice(): void
    {
        $this->section('replay protection');
        $user = $this->createUser();

        $this->step('first reset succeeds and consumes the token');
        $this->postJson('/api/forgot-password', ['login' => $user->email])->assertOk();
        $token = $this->captureToken($user);

        $first = $this->postJson('/api/reset-password', [
            'token' => $token,
            'login' => $user->email,
            'password' => 'FirstReset111!',
            'password_confirmation' => 'FirstReset111!',
        ]);
        $first->assertOk();

        $this->step('second attempt with the same token fails');
        $second = $this->postJson('/api/reset-password', [
            'token' => $token,
            'login' => $user->email,
            'password' => 'SecondReset222!',
            'password_confirmation' => 'SecondReset222!',
        ]);
        $second->assertStatus(422);
        $this->assertFalse(Hash::check('SecondReset222!', $user->fresh()->password));
    }

    public function test_password_change_revokes_existing_sessions(): void
    {
        $this->section('existing authentication session behaviour');
        $user = $this->createUser();

        $this->step('issuing an API token before the reset');
        $oldToken = $user->createToken('auth_token')->plainTextToken;

        $this->step('performing the reset');
        $this->postJson('/api/forgot-password', ['login' => $user->email])->assertOk();
        $token = $this->captureToken($user);
        $this->postJson('/api/reset-password', [
            'token' => $token,
            'login' => $user->email,
            'password' => 'SessionKill42!',
            'password_confirmation' => 'SessionKill42!',
        ])->assertOk();

        $this->step('old token can no longer authenticate');
        $me = $this->withHeader('Authorization', 'Bearer '.$oldToken)->getJson('/api/me');
        $me->assertStatus(401);

        $this->note('sanctum tokens remaining for user: '.$user->tokens()->count());
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_account_without_email_never_reveals_existence(): void
    {
        $this->section('enumeration safety for phone-only accounts');
        User::create([
            'name' => 'No Email',
            'email' => null,
            'phone' => '0699999999',
            'role' => 'player',
            'status' => 'approved',
            'password' => 'Something12!',
        ]);

        $this->step('forgot-password for a phone-only account');
        $noEmail = $this->postJson('/api/forgot-password', ['login' => '0699999999']);

        $this->step('forgot-password for a non-existent account');
        $ghost = $this->postJson('/api/forgot-password', ['login' => 'nobody@x.com']);

        $this->step('responses are byte-identical and no notification is sent');
        $this->assertSame($noEmail->json(), $ghost->json());
        Notification::assertNothingSent();
        $this->assertSame(0, DB::table('password_reset_tokens')->count());
    }
}
