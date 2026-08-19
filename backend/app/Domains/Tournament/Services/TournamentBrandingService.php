<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Support\Facades\Storage;

class TournamentBrandingService
{
    /**
     * @param  array{cover?: mixed, logo?: mixed, primary_color?: string|null, secondary_color?: string|null}  $data
     */
    public function update(Tournament $tournament, array $data): Tournament
    {
        if (isset($data['cover'])) {
            if ($tournament->cover_path && Storage::disk('public')->exists($tournament->cover_path)) {
                Storage::disk('public')->delete($tournament->cover_path);
            }

            $result = app(ImageThumbnailService::class)->storeWithThumbnail($data['cover'], 'tournaments/covers');
            $tournament->cover_path = $result['path'];
        }

        if (isset($data['logo'])) {
            if ($tournament->logo_path && Storage::disk('public')->exists($tournament->logo_path)) {
                Storage::disk('public')->delete($tournament->logo_path);
            }

            $result = app(ImageThumbnailService::class)->storeWithThumbnail($data['logo'], 'tournaments/logos');
            $tournament->logo_path = $result['path'];
        }

        if (array_key_exists('primary_color', $data)) {
            $tournament->primary_color = $data['primary_color'] ?: null;
        }

        if (array_key_exists('secondary_color', $data)) {
            $tournament->secondary_color = $data['secondary_color'] ?: null;
        }

        $tournament->save();

        return $tournament;
    }

    /**
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'cover' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
        ];
    }
}
