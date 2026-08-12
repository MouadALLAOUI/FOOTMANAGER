<?php

namespace App\Console\Commands;

use App\Domains\Booking\Models\TerrainImage;
use App\Domains\Player\Models\PlayerGalleryImage;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamGalleryImage;
use Illuminate\Console\Command;

class BackfillImageThumbnails extends Command
{
    protected $signature = 'images:backfill-thumbnails {--force : Regenerate thumbnails even if they already exist}';

    protected $description = 'Generate thumbnail images for all existing stored images (terrain, galleries, team logos/covers, player photos/covers)';

    public function handle(): int
    {
        $service = app(ImageThumbnailService::class);
        $force = $this->option('force');
        $total = 0;

        $total += $this->process(
            TerrainImage::query(),
            'image_path',
            'thumbnail_path',
            $service,
            $force
        );

        $total += $this->process(
            TeamGalleryImage::query(),
            'image_path',
            'thumbnail_path',
            $service,
            $force
        );

        $total += $this->process(
            PlayerGalleryImage::query(),
            'image_path',
            'thumbnail_path',
            $service,
            $force
        );

        $total += $this->process(
            Team::query(),
            'logo_path',
            'logo_thumbnail_path',
            $service,
            $force
        );

        $total += $this->process(
            Team::query(),
            'cover_image_path',
            'cover_thumbnail_path',
            $service,
            $force
        );

        $total += $this->process(
            PlayerProfile::query(),
            'photo_path',
            'photo_thumbnail_path',
            $service,
            $force
        );

        $total += $this->process(
            PlayerProfile::query(),
            'cover_photo_path',
            'cover_photo_thumbnail_path',
            $service,
            $force
        );

        $this->info("Backfilled thumbnails for {$total} image(s).");

        return self::SUCCESS;
    }

    protected function process($query, string $sourceColumn, string $thumbColumn, ImageThumbnailService $service, bool $force): int
    {
        $count = 0;
        $query->chunkById(200, function ($items) use ($sourceColumn, $thumbColumn, $service, $force, &$count) {
            foreach ($items as $item) {
                $source = $item->{$sourceColumn};

                if (! $source) {
                    continue;
                }

                if (! $force && $item->{$thumbColumn}) {
                    continue;
                }

                $thumbnail = $service->generateForExisting($source);

                if (! $thumbnail) {
                    continue;
                }

                $item->{$thumbColumn} = $thumbnail;
                $item->saveQuietly();
                $count++;
            }
        });

        return $count;
    }
}
