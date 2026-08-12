<?php

namespace App\Domains\Shared\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ImageThumbnailService
{
    protected string $disk = 'public';

    protected int $thumbnailWidth = 400;

    protected ?int $thumbnailHeight = null;

    public function storeWithThumbnail(
        UploadedFile $file,
        string $directory,
        ?int $width = null,
        ?int $height = null
    ): array {
        $path = $file->store($directory, $this->disk);

        $thumbnailPath = null;

        try {
            $thumbnailPath = $this->makeThumbnailFromPath(
                $file->getRealPath(),
                $directory,
                $width,
                $height
            );
        } catch (Throwable $e) {
            // Thumbnail generation is best-effort; the original stays available.
        }

        return [
            'path' => $path,
            'thumbnail_path' => $thumbnailPath,
        ];
    }

    public function generateForExisting(string $relativePath, ?int $width = null, ?int $height = null): ?string
    {
        if (! $relativePath) {
            return null;
        }

        $absolute = Storage::disk($this->disk)->path($relativePath);

        if (! is_file($absolute)) {
            return null;
        }

        $directory = dirname($relativePath);

        try {
            return $this->makeThumbnailFromPath($absolute, $directory, $width, $height);
        } catch (Throwable $e) {
            return null;
        }
    }

    protected function makeThumbnailFromPath(
        string $srcPath,
        string $directory,
        ?int $width,
        ?int $height
    ): ?string {
        if (! extension_loaded('gd')) {
            return null;
        }

        $size = @getimagesize($srcPath);

        if ($size === false) {
            return null;
        }

        [$srcW, $srcH, $type] = $size;

        $src = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($srcPath),
            IMAGETYPE_PNG => @imagecreatefrompng($srcPath),
            IMAGETYPE_WEBP => @imagecreatefromwebp($srcPath),
            IMAGETYPE_GIF => @imagecreatefromgif($srcPath),
            default => null,
        };

        if (! $src) {
            return null;
        }

        $width = $width ?? $this->thumbnailWidth;
        $height = $height ?? $this->thumbnailHeight;

        $ratio = $height ? min($width / $srcW, $height / $srcH) : $width / $srcW;
        $ratio = min($ratio, 1);

        $dstW = max(1, (int) round($srcW * $ratio));
        $dstH = max(1, (int) round($srcH * $ratio));

        $dst = imagecreatetruecolor($dstW, $dstH);

        if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefilledrectangle($dst, 0, 0, $dstW, $dstH, $transparent);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);

        $name = 'thumb_' . uniqid() . '.jpg';
        $relative = $directory . '/thumbnails/' . $name;
        $full = Storage::disk($this->disk)->path($relative);
        $dir = dirname($full);

        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        imagejpeg($dst, $full, 80);

        imagedestroy($src);
        imagedestroy($dst);

        return $relative;
    }
}
