<?php

namespace App\Domains\Team\Services;

use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TeamProfileService
{
    public function show(Team $team): Team
    {
        return $team->load([
            'primaryStadium',
            'captain',
            'viceCaptain',
            'manager:id,name,phone,status,is_whatsapp',
        ]);
    }

    public function update(User $user, Team $team, array $data): Team
    {
        if (($data['visibility'] ?? null) === 'public') {
            app(SubscriptionService::class)->authorizeFeature($user, 'landing_visibility');
        }

        $team->update($data);
        TeamCache::flushTeam($team->id);

        return $this->show($team);
    }

    public function uploadLogo(Team $team, $file): Team
    {
        $this->assertValidImage($file);

        if ($team->logo_path && Storage::disk('public')->exists($team->logo_path)) {
            Storage::disk('public')->delete($team->logo_path);
        }

        if ($team->logo_thumbnail_path && Storage::disk('public')->exists($team->logo_thumbnail_path)) {
            Storage::disk('public')->delete($team->logo_thumbnail_path);
        }

        $result = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'teams/logos');
        $team->update([
            'logo_path' => $result['path'],
            'logo_thumbnail_path' => $result['thumbnail_path'],
        ]);
        TeamCache::flushTeam($team->id);

        return $this->show($team);
    }

    public function uploadCover(Team $team, $file): Team
    {
        $this->assertValidImage($file);

        if ($team->cover_image_path && Storage::disk('public')->exists($team->cover_image_path)) {
            Storage::disk('public')->delete($team->cover_image_path);
        }

        if ($team->cover_thumbnail_path && Storage::disk('public')->exists($team->cover_thumbnail_path)) {
            Storage::disk('public')->delete($team->cover_thumbnail_path);
        }

        $result = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'teams/covers');
        $team->update([
            'cover_image_path' => $result['path'],
            'cover_thumbnail_path' => $result['thumbnail_path'],
        ]);
        TeamCache::flushTeam($team->id);

        return $this->show($team);
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'member_count' => 'sometimes|integer|min:1',
            'category' => 'sometimes|in:adult,teenager,children',
            'level' => 'sometimes|nullable|string|max:50',
            'association_name' => 'sometimes|nullable|string|max:255',
            'city' => 'sometimes|nullable|string|max:255',
            'region' => 'sometimes|nullable|string|max:255',
            'description' => 'sometimes|nullable|string|max:1000',
            'primary_color' => 'sometimes|nullable|string|max:20',
            'secondary_color' => 'sometimes|nullable|string|max:20',
            'founded_year' => 'sometimes|nullable|integer|min:1900|max:'.(date('Y') + 1),
            'max_squad_size' => 'sometimes|nullable|integer|min:1|max:99',
            'visibility' => 'sometimes|in:public,private',
            'preferred_formats' => 'sometimes|nullable|array',
            'preferred_formats.*' => 'in:5v5,7v7,11v11',
            'social_links' => 'sometimes|nullable|array',
            'social_links.*' => 'url',
            'primary_stadium_id' => 'sometimes|nullable|exists:stadiums,id',
        ];
    }

    private function assertValidImage($file): void
    {
        $mimes = implode(',', config('team.gallery.allowed_mimes'));
        $maxKb = (int) config('team.gallery.max_size_kb');

        $validator = validator([
            'image' => $file,
        ], [
            'image' => "required|image|mimes:{$mimes}|max:{$maxKb}",
        ]);

        if ($validator->fails()) {
            throw ValidationException::withMessages($validator->errors()->toArray());
        }
    }
}
