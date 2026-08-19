<?php

namespace Database\Seeders;

use App\Domains\Subscription\Models\Feature;
use Illuminate\Database\Seeder;

class FeatureSeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            [
                'key' => 'account_creation',
                'name' => 'إنشاء الحسابات',
                'description' => 'إمكانية فتح حسابات جديدة على المنصة',
                'type' => 'boolean',
                'scope' => 'platform',
            ],
            [
                'key' => 'friendly_match_requests',
                'name' => 'طلبات المباريات الودية',
                'description' => 'عدد طلبات المباريات الودية المتاحة',
                'type' => 'limit',
                'scope' => 'manager',
            ],
            [
                'key' => 'field_booking',
                'name' => 'حجز الملاعب',
                'description' => 'حجز الملاعب مباشرة من المنصة',
                'type' => 'boolean',
                'scope' => 'manager',
            ],
            [
                'key' => 'weekly_subscriptions',
                'name' => 'الاشتراك الأسبوعي للملاعب',
                'description' => 'إدارة حجوزات الأبونمان الأسبوعي',
                'type' => 'boolean',
                'scope' => 'terrain_owner',
            ],
            [
                'key' => 'team_management',
                'name' => 'إدارة الفريق',
                'description' => 'أدوات إدارة الفريق وقائمته',
                'type' => 'boolean',
                'scope' => 'manager',
            ],
            [
                'key' => 'basic_statistics',
                'name' => 'الإحصائيات الأساسية',
                'description' => 'إحصائيات الفريق الأساسية',
                'type' => 'boolean',
                'scope' => 'manager',
            ],
            [
                'key' => 'advanced_statistics',
                'name' => 'إحصائيات متقدمة',
                'description' => 'تحليلات وإحصائيات متقدمة للفريق',
                'type' => 'boolean',
                'scope' => 'manager',
            ],
            [
                'key' => 'mercenary_accounts',
                'name' => 'حسابات اللاعبين الأحرار',
                'description' => 'إتاحة حساب اللاعب الحر',
                'type' => 'boolean',
                'scope' => 'player',
            ],
            [
                'key' => 'achievements',
                'name' => 'الإنجازات',
                'description' => 'نظام الإنجازات والشارات',
                'type' => 'boolean',
                'scope' => 'player',
            ],
            [
                'key' => 'player_card',
                'name' => 'بطاقة اللاعب',
                'description' => 'بطاقة تعريف رقمية للاعب',
                'type' => 'boolean',
                'scope' => 'player',
            ],
            [
                'key' => 'landing_visibility',
                'name' => 'الظهور في الصفحة الرئيسية',
                'description' => 'ظهور الفريق في الصفحة الرئيسية والبحث العام',
                'type' => 'boolean',
                'scope' => 'shared',
            ],
            [
                'key' => 'priority_support',
                'name' => 'دعم ذو أولوية',
                'description' => 'دعم فني بأولوية عالية',
                'type' => 'boolean',
                'scope' => 'platform',
            ],
            [
                'key' => 'tournament_creation',
                'name' => 'إنشاء البطولات',
                'description' => 'إمكانية إنشاء البطولات وتنظيمها',
                'type' => 'boolean',
                'scope' => 'committee',
            ],
            [
                'key' => 'terrain_creation',
                'name' => 'إنشاء الملاعب',
                'description' => 'إمكانية إضافة الملاعب على المنصة',
                'type' => 'boolean',
                'scope' => 'terrain_owner',
            ],
            [
                'key' => 'premium_ui',
                'name' => 'واجهة مميزة',
                'description' => 'واجهة ومظهر خاص بالمشتركين',
                'type' => 'boolean',
                'scope' => 'platform',
            ],
            [
                'key' => 'feature_requests',
                'name' => 'طلب ميزات جديدة',
                'description' => 'المشاركة في اقتراح وطلب ميزات جديدة',
                'type' => 'boolean',
                'scope' => 'platform',
            ],
            [
                'key' => 'terrain_limit',
                'name' => 'حد الملاعب',
                'description' => 'الحد الأقصى لعدد الملاعب المسموح بها',
                'type' => 'limit',
                'scope' => 'terrain_owner',
            ],
            [
                'key' => 'tournament_limit',
                'name' => 'حد البطولات',
                'description' => 'الحد الأقصى لعدد البطولات المتزامنة',
                'type' => 'limit',
                'scope' => 'committee',
            ],
        ];

        foreach ($features as $feature) {
            Feature::updateOrCreate(['key' => $feature['key']], $feature);
        }
    }
}
