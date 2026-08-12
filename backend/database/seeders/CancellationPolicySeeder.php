<?php

namespace Database\Seeders;

use App\Domains\Booking\Models\CancellationPolicy;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Seeder;

class CancellationPolicySeeder extends Seeder
{
    public function run(): void
    {
        $policies = [
            [
                'name' => 'مرنة',
                'slug' => 'flexible',
                'description' => 'إلغاء مجاني كامل حتى 24 ساعة قبل موعد الحجز',
                'hours_before' => 24,
                'refund_percentage' => 100,
                'is_active' => true,
            ],
            [
                'name' => 'معتدلة',
                'slug' => 'moderate',
                'description' => 'استرداد 50% من المبلغ عند الإلغاء قبل 48 ساعة من الموعد',
                'hours_before' => 48,
                'refund_percentage' => 50,
                'is_active' => true,
            ],
            [
                'name' => 'صارمة',
                'slug' => 'strict',
                'description' => 'لا استرداد عند الإلغاء',
                'hours_before' => 72,
                'refund_percentage' => 0,
                'is_active' => true,
            ],
        ];

        foreach ($policies as $policy) {
            CancellationPolicy::updateOrCreate(['slug' => $policy['slug']], $policy);
        }

        $defaultId = CancellationPolicy::where('slug', 'flexible')->value('id');

        Stadium::whereNull('cancellation_policy_id')
            ->update(['cancellation_policy_id' => $defaultId]);
    }
}
