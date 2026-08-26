<?php

namespace Tests\Feature\Security;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class PiiExposureTest extends TestCase
{
    use RefreshDatabase, StreamsProgress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->step('creating test users');
        $this->admin = User::factory()->approved()->create(['role' => 'admin']);
        $this->manager = User::factory()->approved()->create([
            'name' => 'Ahmed Manager',
            'email' => 'ahmed@test.com',
            'phone' => '0611111111',
            'is_whatsapp' => true,
        ]);
        $this->otherManager = User::factory()->approved()->create([
            'name' => 'Ali Other',
            'email' => 'ali@test.com',
            'phone' => '0622222222',
        ]);
    }

    // ───────────────────────────────────────────
    // A. User Model $hidden
    // ───────────────────────────────────────────

    public function test_user_model_hides_sensitive_fields_by_default(): void
    {
        $this->section('User model serialization hides PII');

        $this->step('serializing a manager via toArray');
        $array = $this->manager->toArray();

        $hidden = ['phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path',
            'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at',
            'password', 'remember_token'];

        foreach ($hidden as $field) {
            $this->note("field '{$field}' should be absent or null");
            $this->assertArrayNotHasKey($field, $array, "User model leaks '{$field}' in default serialization");
        }

        $this->step('public fields are still present');
        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('name', $array);
        $this->assertArrayHasKey('avatar_url', $array);
    }

    public function test_user_make_visible_restores_hidden_fields(): void
    {
        $this->section('makeVisible restores PII for authorized contexts');

        $this->step('makeVisible phone/email on self');
        $user = $this->manager->makeVisible('phone', 'email', 'is_whatsapp');

        $this->assertEquals('0611111111', $user->phone);
        $this->assertEquals('ahmed@test.com', $user->email);
        $this->assertTrue($user->is_whatsapp);
    }

    // ───────────────────────────────────────────
    // B. UserResource context tests
    // ───────────────────────────────────────────

    public function test_user_resource_public_context_excludes_pii(): void
    {
        $this->section('UserResource public context');

        $resource = new UserResource($this->manager);
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('name', $array);
        $this->assertArrayNotHasKey('phone', $array);
        $this->assertArrayNotHasKey('email', $array);
        $this->assertArrayNotHasKey('is_whatsapp', $array);
    }

    public function test_user_resource_self_context_includes_pii(): void
    {
        $this->section('UserResource self context');

        $resource = new UserResource($this->manager, 'self');
        $array = $resource->toArray(request());

        $this->assertEquals('0611111111', $array['phone']);
        $this->assertEquals('ahmed@test.com', $array['email']);
        $this->assertTrue($array['is_whatsapp']);
        $this->assertArrayHasKey('role', $array);
    }

    public function test_user_resource_team_member_context_excludes_email(): void
    {
        $this->section('UserResource team_member context');

        $resource = new UserResource($this->manager, 'team_member');
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('phone', $array);
        $this->assertArrayNotHasKey('email', $array);
        $this->assertArrayHasKey('is_whatsapp', $array);
    }

    public function test_user_resource_booking_coordination_has_phone_only(): void
    {
        $this->section('UserResource booking_coordination context');

        $resource = new UserResource($this->manager, 'booking_coordination');
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('phone', $array);
        $this->assertArrayNotHasKey('email', $array);
        $this->assertArrayNotHasKey('is_whatsapp', $array);
    }

    public function test_user_resource_admin_context_includes_all_fields(): void
    {
        $this->section('UserResource admin context');

        $this->manager->refresh();

        $resource = new UserResource($this->manager, 'admin');
        $array = $resource->toArray(request());

        $this->assertEquals('0611111111', $array['phone']);
        $this->assertEquals('ahmed@test.com', $array['email']);
        $this->assertArrayHasKey('email_verified_at', $array);
        $this->assertArrayHasKey('activity_lock_reason', $array);
        $this->assertArrayHasKey('activity_locked_by', $array);
        $this->assertArrayHasKey('activity_locked_at', $array);
        $this->assertArrayHasKey('role', $array);
        $this->assertArrayHasKey('status', $array);
    }

    public function test_user_resource_match_opponent_excludes_pii(): void
    {
        $this->section('UserResource match_opponent context');

        $resource = new UserResource($this->manager, 'match_opponent');
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('name', $array);
        $this->assertArrayNotHasKey('phone', $array);
        $this->assertArrayNotHasKey('email', $array);
        $this->assertArrayNotHasKey('is_whatsapp', $array);
    }

    // ───────────────────────────────────────────
    // C. Auth endpoint — login response exposes self-data
    // ───────────────────────────────────────────

    public function test_login_response_includes_phone_and_email(): void
    {
        $this->section('auth login exposes self PII');

        $this->step('login as manager');
        $res = $this->postJson('/api/login', [
            'login' => 'ahmed@test.com',
            'password' => 'password',
        ]);

        $res->assertOk();
        $this->note('checking user data in login response');
        $this->assertArrayHasKey('phone', $res->json('user'));
        $this->assertArrayHasKey('email', $res->json('user'));
        $this->assertEquals('0611111111', $res->json('user.phone'));
        $this->assertEquals('ahmed@test.com', $res->json('user.email'));
    }

    // ───────────────────────────────────────────
    // D. Authenticated /me exposes own PII
    // ───────────────────────────────────────────

    public function test_me_endpoint_exposes_own_phone_and_email(): void
    {
        $this->section('GET /api/me exposes own PII');

        Sanctum::actingAs($this->manager);

        $res = $this->getJson('/api/me');
        $res->assertOk();

        $this->assertEquals('0611111111', $res->json('user.phone'));
        $this->assertEquals('ahmed@test.com', $res->json('user.email'));
        $this->assertTrue($res->json('user.is_whatsapp'));
    }

    // ───────────────────────────────────────────
    // E. Admin — can see all user data
    // ───────────────────────────────────────────

    public function test_admin_can_see_all_user_fields(): void
    {
        $this->section('admin managers list exposes full PII');

        Sanctum::actingAs($this->admin);

        $this->step('GET /api/admin/managers?status=approved');
        $res = $this->getJson('/api/admin/managers?status=approved');
        $res->assertOk();

        $managers = $res->json('managers');
        $target = collect($managers)->firstWhere('id', $this->manager->id);

        $this->assertNotNull($target, 'target manager not found in admin list');
        $this->assertEquals('0611111111', $target['phone']);
        $this->assertEquals('ahmed@test.com', $target['email']);
        $this->assertArrayHasKey('email_verified_at', $target);
    }

    public function test_admin_single_user_shows_all_fields(): void
    {
        $this->section('admin single manager shows full PII');

        Sanctum::actingAs($this->admin);

        $this->step('GET /api/admin/managers/{id}');
        $res = $this->getJson("/api/admin/managers/{$this->manager->id}");
        $res->assertOk();

        $user = $res->json('manager');
        $this->assertEquals('0611111111', $user['phone']);
        $this->assertEquals('ahmed@test.com', $user['email']);
    }

    // ───────────────────────────────────────────
    // F. Team profile — other manager's email is hidden
    // ───────────────────────────────────────────

    public function test_team_profile_does_not_expose_manager_email(): void
    {
        $this->section('public team profile hides manager email and phone');

        $team = $this->manager->team()->create([
            'name' => 'Test Team',
            'city' => 'Casablanca',
            'logo_path' => null,
            'primary_stadium_id' => null,
        ]);

        Sanctum::actingAs($this->otherManager);

        $this->step('GET /api/manager/teams/{id}');
        $res = $this->getJson("/api/manager/teams/{$team->id}");
        $res->assertOk();

        $manager = $res->json('team.manager');
        $this->assertNotNull($manager, 'manager data present');
        $this->assertEquals('Ahmed Manager', $manager['name']);
        $this->assertArrayNotHasKey('email', $manager, 'manager email should not be exposed');
        $this->assertArrayNotHasKey('phone', $manager, 'manager phone should not be exposed via public team view');
    }
}
