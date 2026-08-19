<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_profile_picture(): void
    {
        Storage::fake('public');

        $user = User::factory()->approved()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg', 200, 200),
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.avatar_url', fn ($url) => is_string($url) && str_contains($url, '/storage/avatars/'));

        $user->refresh();

        $this->assertNotNull($user->avatar_path);
        $this->assertStringStartsWith('avatars/', $user->avatar_path);

        Storage::disk('public')->assertExists($user->avatar_path);
    }

    public function test_user_can_replace_existing_profile_picture(): void
    {
        Storage::fake('public');

        $user = User::factory()->approved()->create([
            'avatar_path' => 'avatars/old.jpg',
            'avatar_thumbnail_path' => 'avatars/thumbnails/old.jpg',
        ]);

        Storage::disk('public')->put('avatars/old.jpg', 'old');
        Storage::disk('public')->put('avatars/thumbnails/old.jpg', 'old');

        Sanctum::actingAs($user);

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->image('new.jpg', 200, 200),
        ])->assertOk();

        $user->refresh();

        $this->assertNotSame('avatars/old.jpg', $user->avatar_path);

        Storage::disk('public')->assertMissing('avatars/old.jpg');
        Storage::disk('public')->assertMissing('avatars/thumbnails/old.jpg');
    }

    public function test_user_can_remove_profile_picture(): void
    {
        Storage::fake('public');

        $user = User::factory()->approved()->create([
            'avatar_path' => 'avatars/old.jpg',
            'avatar_thumbnail_path' => 'avatars/thumbnails/old.jpg',
        ]);

        Storage::disk('public')->put('avatars/old.jpg', 'old');
        Storage::disk('public')->put('avatars/thumbnails/old.jpg', 'old');

        Sanctum::actingAs($user);

        $this->deleteJson('/api/me/avatar')
            ->assertOk()
            ->assertJsonPath('user.avatar_url', null);

        $user->refresh();

        $this->assertNull($user->avatar_path);
        $this->assertNull($user->avatar_thumbnail_path);

        Storage::disk('public')->assertMissing('avatars/old.jpg');
        Storage::disk('public')->assertMissing('avatars/thumbnails/old.jpg');
    }

    public function test_upload_only_updates_authenticated_user(): void
    {
        Storage::fake('public');

        $owner = User::factory()->approved()->create(['role' => 'manager']);
        $other = User::factory()->approved()->create(['role' => 'manager']);

        Sanctum::actingAs($owner);

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg', 200, 200),
            'user_id' => $other->id,
        ])->assertOk();

        $other->refresh();

        $this->assertNull($other->avatar_path);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        Storage::fake('public');

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg', 200, 200),
        ])->assertUnauthorized();

        $this->deleteJson('/api/me/avatar')->assertUnauthorized();
    }

    public function test_invalid_file_is_rejected(): void
    {
        Storage::fake('public');

        $user = User::factory()->approved()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->create('document.txt', 100),
        ])->assertUnprocessable();

        $this->assertNull($user->fresh()->avatar_path);
    }

    public function test_oversized_dimensions_are_rejected(): void
    {
        Storage::fake('public');

        $user = User::factory()->approved()->create();

        Sanctum::actingAs($user);

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->image('tiny.jpg', 32, 32),
        ])->assertUnprocessable();

        $this->assertNull($user->fresh()->avatar_path);
    }

    public function test_pending_user_can_upload_own_picture(): void
    {
        Storage::fake('public');

        $pending = User::factory()->pending()->create();

        Sanctum::actingAs($pending);

        $this->postJson('/api/me/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg', 200, 200),
        ])->assertOk();

        $this->assertNotNull($pending->fresh()->avatar_path);
    }

    public function test_me_response_exposes_avatar_url_for_all_roles(): void
    {
        foreach (['admin', 'manager', 'terrain_owner', 'player', 'committee'] as $role) {
            $user = User::factory()->approved()->create(['role' => $role]);

            Sanctum::actingAs($user);

            $this->getJson('/api/me')
                ->assertOk()
                ->assertJsonPath('user.avatar_url', null)
                ->assertJsonPath('user.avatar_thumbnail_url', null);
        }
    }
}
