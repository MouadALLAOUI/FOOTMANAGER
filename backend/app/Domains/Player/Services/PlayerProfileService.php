<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\PlayerCache;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class PlayerProfileService
{
    public function for(User $user): PlayerProfile
    {
        return $user->playerProfile()->firstOrCreate(
            ['user_id' => $user->id],
            $this->defaults($user),
        );
    }

    public function findForUser(int $userId): ?PlayerProfile
    {
        return PlayerProfile::where('user_id', $userId)->first();
    }

    public function update(User $user, array $data): PlayerProfile
    {
        $profile = $this->for($user);

        $fillable = array_intersect_key($data, array_flip((new PlayerProfile)->getFillable()));

        $profile->fill($fillable);
        $profile->save();

        PlayerCache::flush($user->id);

        return $profile;
    }

    public function setAvailabilityStatus(User $user, string $status): PlayerProfile
    {
        $profile = $this->for($user);
        $profile->availability_status = $status;
        $profile->save();

        PlayerCache::flush($user->id);

        return $profile;
    }

    public function uploadPhoto(User $user, $file): PlayerProfile
    {
        $profile = $this->for($user);
        $this->deleteStored($profile->photo_path);
        $this->deleteStored($profile->photo_thumbnail_path);

        $result = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'player-photos');
        $profile->photo_path = $result['path'];
        $profile->photo_thumbnail_path = $result['thumbnail_path'];
        $profile->save();

        PlayerCache::flush($user->id);

        return $profile;
    }

    public function uploadCover(User $user, $file): PlayerProfile
    {
        $profile = $this->for($user);
        $this->deleteStored($profile->cover_photo_path);
        $this->deleteStored($profile->cover_photo_thumbnail_path);

        $result = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'player-covers');
        $profile->cover_photo_path = $result['path'];
        $profile->cover_photo_thumbnail_path = $result['thumbnail_path'];
        $profile->save();

        PlayerCache::flush($user->id);

        return $profile;
    }

    public function syncLegacyCounters(PlayerProfile $profile): void
    {
        $stats = $profile->statistics;

        if (! $stats) {
            return;
        }

        $profile->matches_played = $stats->matches_played;
        $profile->wins = $stats->wins;
        $profile->draws = $stats->draws;
        $profile->losses = $stats->losses;
        $profile->rating = $stats->avg_rating;
        $profile->save();

        PlayerCache::flush($profile->user_id);
    }

    public function pruneGalleryLimit(User $user): void
    {
        $max = (int) config('player.gallery.max_images', 20);

        $excess = $user->galleryImages()
            ->orderBy('order_index')
            ->orderBy('id')
            ->skip($max)
            ->get();

        foreach ($excess as $image) {
            Storage::disk('public')->delete($image->image_path);
            $image->delete();
        }
    }

    private function defaults(User $user): array
    {
        return [
            'position' => null,
            'skill_level' => null,
            'birth_year' => null,
            'birth_date' => null,
            'nationality' => null,
            'height_cm' => null,
            'weight_kg' => null,
            'preferred_foot' => null,
            'strong_foot' => null,
            'secondary_positions' => [],
            'preferred_formats' => [],
            'preferred_playing_days' => [],
            'preferred_playing_hours' => [],
            'preferred_cities' => [],
            'city' => null,
            'description' => null,
            'photo_path' => null,
            'cover_photo_path' => null,
            'is_available' => true,
            'availability_status' => PlayerProfile::AVAILABILITY_AVAILABLE,
            'visibility' => PlayerProfile::VISIBILITY_PUBLIC,
            'contact_visibility' => PlayerProfile::CONTACT_VISIBILITY_TEAM,
            'recruitment_available' => false,
            'language' => 'ar',
            'notification_preferences' => config('player.notification_preferences'),
            'points' => 0,
            'matches_played' => 0,
            'wins' => 0,
            'draws' => 0,
            'losses' => 0,
            'rating' => 0,
            'overall_rating' => 0,
        ];
    }

    private function deleteStored(?string $path): void
    {
        if (! $path || str_starts_with($path, 'http')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
