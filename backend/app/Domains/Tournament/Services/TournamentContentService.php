<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentGalleryImage;
use App\Domains\Tournament\Models\TournamentNews;
use App\Domains\Tournament\Models\TournamentPartner;
use App\Domains\Tournament\Models\TournamentSponsor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TournamentContentService
{
    public function __construct(
        private readonly ImageThumbnailService $thumbnail,
    ) {}

    /* ------------------------------------------------------------------ */
    /* News                                                               */
    /* ------------------------------------------------------------------ */

    /**
     * @param  array{title: string, content: string, cover?: UploadedFile|null, status?: string, published_at?: string|null}  $data
     */
    public function createNews(Tournament $tournament, array $data): TournamentNews
    {
        $news = new TournamentNews($this->newsPayload($data));
        $news->tournament_id = $tournament->id;
        $news->created_by = auth()->id();

        if (! empty($data['cover']) && $data['cover'] instanceof UploadedFile) {
            $stored = $this->thumbnail->storeWithThumbnail($data['cover'], 'tournaments/news');
            $news->cover_path = $stored['path'];
            $news->cover_thumbnail_path = $stored['thumbnail_path'];
        }

        $news->save();

        return $news;
    }

    /**
     * @param  array{title?: string, content?: string, cover?: UploadedFile|null, status?: string, published_at?: string|null}  $data
     */
    public function updateNews(TournamentNews $news, array $data): TournamentNews
    {
        $this->assertBelongsToTournament($news, $news->tournament_id);

        if (! empty($data['cover']) && $data['cover'] instanceof UploadedFile) {
            $this->deleteFiles([$news->cover_path, $news->cover_thumbnail_path]);

            $stored = $this->thumbnail->storeWithThumbnail($data['cover'], 'tournaments/news');
            $news->cover_path = $stored['path'];
            $news->cover_thumbnail_path = $stored['thumbnail_path'];
        }

        $news->fill($this->newsPayload($data));
        $news->save();

        return $news;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function newsPayload(array $data): array
    {
        $payload = [];

        foreach (['title', 'content'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }

        if (array_key_exists('status', $data)) {
            $payload['status'] = $data['status'];
        }

        if (array_key_exists('published_at', $data)) {
            $payload['published_at'] = $data['published_at'] ?: null;
        }

        if (($payload['status'] ?? null) === TournamentNews::STATUS_PUBLISHED && empty($payload['published_at'])) {
            $payload['published_at'] = now();
        }

        return $payload;
    }

    public function deleteNews(TournamentNews $news): void
    {
        $this->assertBelongsToTournament($news, $news->tournament_id);

        $this->deleteFiles([$news->cover_path, $news->cover_thumbnail_path]);
        $news->delete();
    }

    /* ------------------------------------------------------------------ */
    /* Gallery                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * @param  array{image: UploadedFile, caption?: string|null}  $data
     */
    public function storeGalleryImage(Tournament $tournament, array $data): TournamentGalleryImage
    {
        $count = $tournament->galleryImages()->count();
        $max = (int) config('tournament.gallery.max_images', 30);

        if ($count >= $max) {
            throw ValidationException::withMessages([
                'image' => 'تم الوصول إلى الحد الأقصى لعدد الصور (' . $max . ') في معرض هذه البطولة',
            ]);
        }

        $stored = $this->thumbnail->storeWithThumbnail($data['image'], 'tournaments/gallery');

        return $tournament->galleryImages()->create([
            'image_path' => $stored['path'],
            'thumbnail_path' => $stored['thumbnail_path'],
            'caption' => $data['caption'] ?: null,
            'order_index' => ($tournament->galleryImages()->max('order_index') ?? -1) + 1,
            'created_by' => auth()->id(),
        ]);
    }

    /**
     * @param  array{caption?: string|null, order_index?: int|null}  $data
     */
    public function updateGalleryImage(TournamentGalleryImage $image, array $data): TournamentGalleryImage
    {
        $this->assertBelongsToTournament($image, $image->tournament_id);

        foreach (['caption', 'order_index'] as $field) {
            if (array_key_exists($field, $data)) {
                $image->{$field} = $data[$field];
            }
        }

        $image->save();

        return $image;
    }

    public function deleteGalleryImage(TournamentGalleryImage $image): void
    {
        $this->assertBelongsToTournament($image, $image->tournament_id);

        $this->deleteFiles([$image->image_path, $image->thumbnail_path]);
        $image->delete();
    }

    /* ------------------------------------------------------------------ */
    /* Sponsors                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * @param  array{name: string, logo?: UploadedFile|null, link?: string|null, level?: string|null, order_index?: int|null}  $data
     */
    public function storeSponsor(Tournament $tournament, array $data): TournamentSponsor
    {
        return $tournament->sponsors()->create($this->sponsorPayload($data));
    }

    /**
     * @param  array{name?: string, logo?: UploadedFile|null, link?: string|null, level?: string|null, order_index?: int|null}  $data
     */
    public function updateSponsor(TournamentSponsor $sponsor, array $data): TournamentSponsor
    {
        $this->assertBelongsToTournament($sponsor, $sponsor->tournament_id);

        if (! empty($data['logo']) && $data['logo'] instanceof UploadedFile) {
            $this->deleteFiles([$sponsor->logo_path, $sponsor->logo_thumbnail_path]);

            $stored = $this->thumbnail->storeWithThumbnail($data['logo'], 'tournaments/sponsors');
            $sponsor->logo_path = $stored['path'];
            $sponsor->logo_thumbnail_path = $stored['thumbnail_path'];
        }

        $sponsor->fill($this->sponsorPayload($data));
        $sponsor->save();

        return $sponsor;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sponsorPayload(array $data): array
    {
        $payload = [];

        foreach (['name', 'link', 'level', 'order_index'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }

        return $payload;
    }

    public function deleteSponsor(TournamentSponsor $sponsor): void
    {
        $this->assertBelongsToTournament($sponsor, $sponsor->tournament_id);

        $this->deleteFiles([$sponsor->logo_path, $sponsor->logo_thumbnail_path]);
        $sponsor->delete();
    }

    /* ------------------------------------------------------------------ */
    /* Partners                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * @param  array{name: string, logo?: UploadedFile|null, link?: string|null, order_index?: int|null}  $data
     */
    public function storePartner(Tournament $tournament, array $data): TournamentPartner
    {
        return $tournament->partners()->create($this->partnerPayload($data));
    }

    /**
     * @param  array{name?: string, logo?: UploadedFile|null, link?: string|null, order_index?: int|null}  $data
     */
    public function updatePartner(TournamentPartner $partner, array $data): TournamentPartner
    {
        $this->assertBelongsToTournament($partner, $partner->tournament_id);

        if (! empty($data['logo']) && $data['logo'] instanceof UploadedFile) {
            $this->deleteFiles([$partner->logo_path, $partner->logo_thumbnail_path]);

            $stored = $this->thumbnail->storeWithThumbnail($data['logo'], 'tournaments/partners');
            $partner->logo_path = $stored['path'];
            $partner->logo_thumbnail_path = $stored['thumbnail_path'];
        }

        $partner->fill($this->partnerPayload($data));
        $partner->save();

        return $partner;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function partnerPayload(array $data): array
    {
        $payload = [];

        foreach (['name', 'link', 'order_index'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }

        return $payload;
    }

    public function deletePartner(TournamentPartner $partner): void
    {
        $this->assertBelongsToTournament($partner, $partner->tournament_id);

        $this->deleteFiles([$partner->logo_path, $partner->logo_thumbnail_path]);
        $partner->delete();
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private function assertBelongsToTournament(mixed $model, int $tournamentId): void
    {
        if ((int) $model->tournament_id !== $tournamentId) {
            abort(404);
        }
    }

    /**
     * @param  array<int, string|null>  $paths
     */
    private function deleteFiles(array $paths): void
    {
        foreach ($paths as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
