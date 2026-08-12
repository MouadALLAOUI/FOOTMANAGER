<?php

namespace App\Domains\Team\Services;

use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamGalleryImage;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TeamGalleryService
{
    public function maxImages(): int
    {
        return (int) (Setting::get('team.gallery_max_images', config('team.gallery.max_images')));
    }

    public function index(Team $team): array
    {
        $images = $team->galleryImages()
            ->with('uploader:id,name')
            ->get();

        return [
            'images' => $images,
            'max_images' => $this->maxImages(),
            'total' => $images->count(),
        ];
    }

    public function store(Team $team, User $uploader, $file, array $data): TeamGalleryImage
    {
        $currentCount = $team->galleryImages()->count();

        if ($currentCount >= $this->maxImages()) {
            throw ValidationException::withMessages([
                'image' => "تم الوصول إلى الحد الأقصى لصور المعرض ({$this->maxImages()} صورة)",
            ]);
        }

        $this->assertValidImage($file);

        $nextOrder = $team->galleryImages()->max('order_index') + 1;

        $thumbnail = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'teams/gallery');

        $image = $team->galleryImages()->create([
            'image_path' => $thumbnail['path'],
            'thumbnail_path' => $thumbnail['thumbnail_path'],
            'caption' => $data['caption'] ?? null,
            'category' => $data['category'] ?? 'team',
            'uploaded_by' => $uploader->id,
            'order_index' => $data['order_index'] ?? $nextOrder,
        ]);

        TeamCache::flushTeam($team->id);

        return $image->load('uploader:id,name');
    }

    public function destroy(Team $team, TeamGalleryImage $image): void
    {
        if ($image->is_cover) {
            $team->update(['cover_image_path' => null]);
        }

        if (Storage::disk('public')->exists($image->image_path)) {
            Storage::disk('public')->delete($image->image_path);
        }

        if ($image->thumbnail_path && Storage::disk('public')->exists($image->thumbnail_path)) {
            Storage::disk('public')->delete($image->thumbnail_path);
        }

        $image->delete();
        TeamCache::flushTeam($team->id);
    }

    public function setCover(Team $team, TeamGalleryImage $image): TeamGalleryImage
    {
        $team->galleryImages()->where('is_cover', true)->update(['is_cover' => false]);

        $image->update(['is_cover' => true]);
        $team->update(['cover_image_path' => $image->image_path]);

        TeamCache::flushTeam($team->id);

        return $image->fresh()->load('uploader:id,name');
    }

    public function reorder(Team $team, array $orderedIds): void
    {
        foreach ($orderedIds as $index => $imageId) {
            $team->galleryImages()
                ->where('id', $imageId)
                ->update(['order_index' => $index]);
        }

        TeamCache::flushTeam($team->id);
    }

    public function rules(): array
    {
        return [
            'image' => 'required|image|mimes:'.implode(',', config('team.gallery.allowed_mimes'))
                .'|max:'.(int) config('team.gallery.max_size_kb'),
            'caption' => 'sometimes|nullable|string|max:255',
            'category' => 'sometimes|in:training,matches,celebrations,team',
            'order_index' => 'sometimes|nullable|integer|min:0',
        ];
    }

    private function assertValidImage($file): void
    {
        $validator = validator([
            'image' => $file,
        ], [
            'image' => 'required|image|mimes:'.implode(',', config('team.gallery.allowed_mimes'))
                .'|max:'.(int) config('team.gallery.max_size_kb'),
        ]);

        if ($validator->fails()) {
            throw ValidationException::withMessages($validator->errors()->toArray());
        }
    }
}
