<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\PlayerGalleryImage;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;

class PlayerGalleryService
{
    public function index(User $user): Collection
    {
        return $user->galleryImages()
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();
    }

    public function store(User $user, array $data): PlayerGalleryImage
    {
        $file = $data['image'];

        $thumbnail = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'player-gallery');

        $image = $user->galleryImages()->create([
            'image_path' => $thumbnail['path'],
            'thumbnail_path' => $thumbnail['thumbnail_path'],
            'category' => $data['category'] ?? PlayerGalleryImage::CATEGORY_TRAINING,
            'caption' => $data['caption'] ?? null,
            'is_cover' => (bool) ($data['is_cover'] ?? false),
            'order_index' => (int) ($data['order_index'] ?? $user->galleryImages()->count()),
        ]);

        if ($image->is_cover) {
            $this->clearOtherCovers($user, $image);
        }

        return $image;
    }

    public function setCover(User $user, PlayerGalleryImage $image): PlayerGalleryImage
    {
        $this->clearOtherCovers($user, $image);
        $image->update(['is_cover' => true]);

        return $image;
    }

    public function update(User $user, PlayerGalleryImage $image, array $data): PlayerGalleryImage
    {
        if (array_key_exists('caption', $data)) {
            $image->caption = $data['caption'];
        }

        if (array_key_exists('category', $data)) {
            $image->category = $data['category'];
        }

        if (array_key_exists('order_index', $data)) {
            $image->order_index = (int) $data['order_index'];
        }

        $image->save();

        return $image;
    }

    public function reorder(User $user, array $orderedIds): void
    {
        foreach (array_values($orderedIds) as $index => $id) {
            $user->galleryImages()->where('id', $id)->update(['order_index' => $index]);
        }
    }

    public function destroy(User $user, PlayerGalleryImage $image): void
    {
        Storage::disk('public')->delete($image->image_path);

        if ($image->thumbnail_path) {
            Storage::disk('public')->delete($image->thumbnail_path);
        }

        $image->delete();
    }

    private function clearOtherCovers(User $user, PlayerGalleryImage $keep): void
    {
        $user->galleryImages()
            ->where('is_cover', true)
            ->where('id', '!=', $keep->id)
            ->update(['is_cover' => false]);
    }
}
