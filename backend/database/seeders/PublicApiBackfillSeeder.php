<?php

namespace Database\Seeders;

use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PublicApiBackfillSeeder extends Seeder
{
    private array $cityCoords = [
        'الدار البيضاء' => ['latitude' => 33.5731, 'longitude' => -7.5898],
        'الرباط' => ['latitude' => 34.0209, 'longitude' => -6.8416],
        'مراكش' => ['latitude' => 31.6295, 'longitude' => -7.9811],
        'فاس' => ['latitude' => 34.0331, 'longitude' => -5.0003],
        'طنجة' => ['latitude' => 35.7595, 'longitude' => -5.8340],
        'الجزائر' => ['latitude' => 36.7538, 'longitude' => 3.0588],
    ];

    public function run(): void
    {
        $this->backfillStadiums();
        $this->backfillTeams();
    }

    private function backfillStadiums(): void
    {
        Stadium::all()->each(function (Stadium $stadium) {
            $updates = [];

            if (empty($stadium->slug)) {
                $base = Str::slug($stadium->name);
                $slug = $base ?: 'stadium';
                $counter = 1;
                while (Stadium::where('slug', $slug)->where('id', '!=', $stadium->id)->exists()) {
                    $slug = $base.'-'.$counter++;
                }
                $updates['slug'] = $slug;
            }

            if (empty($stadium->description)) {
                $updates['description'] = 'ملعب '.$stadium->name.' — '.$stadium->city;
            }

            if ($stadium->latitude === null || $stadium->longitude === null) {
                $coords = $this->cityCoords[$stadium->city] ?? null;
                if ($coords) {
                    $updates['latitude'] = $coords['latitude'];
                    $updates['longitude'] = $coords['longitude'];
                }
            }

            if ($stadium->price_per_hour === null) {
                $updates['price_per_hour'] = $stadium->price_per_team ?: null;
            }

            if ($stadium->rating === null) {
                $updates['rating'] = 4.5;
            }

            if ($updates !== []) {
                $stadium->update($updates);
            }
        });

        Stadium::where('is_covered', false)
            ->where('type', 'salle')
            ->update(['is_covered' => true]);
    }

    private function backfillTeams(): void
    {
        Team::whereNull('level')->get()->each(function (Team $team) {
            $points = (int) $team->points;

            $level = match (true) {
                $points >= 15 => 'excellent',
                $points >= 10 => 'very_good',
                $points >= 5 => 'good',
                $points > 0 => 'intermediate',
                default => 'beginner',
            };

            $team->update(['level' => $level]);
        });
    }
}
