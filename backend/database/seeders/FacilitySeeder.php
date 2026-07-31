<?php

namespace Database\Seeders;

use App\Models\Facility;
use Illuminate\Database\Seeder;

class FacilitySeeder extends Seeder
{
    public function run(): void
    {
        $facilities = [
            ['name' => 'مقاعد احتياط', 'icon' => '🪑'],
            ['name' => 'بطولات', 'icon' => '🏆'],
            ['name' => 'إنارة', 'icon' => '💡'],
            ['name' => 'غرف ملابس', 'icon' => '🚿'],
            ['name' => 'موقف سيارات', 'icon' => '🅿️'],
            ['name' => 'مقهى', 'icon' => '☕'],
            ['name' => 'كاميرات مراقبة', 'icon' => '📹'],
            ['name' => 'صالة انتظار', 'icon' => '🛋️'],
        ];

        foreach ($facilities as $f) {
            Facility::create($f);
        }
    }
}
