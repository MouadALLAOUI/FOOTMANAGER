<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // Platform basics
            ['key' => 'platform_name', 'value' => 'أجي نقصرو', 'type' => 'string', 'group' => 'platform', 'label' => 'اسم المنصة'],
            ['key' => 'platform_tagline', 'value' => 'منصة تنظيم المباريات والملاعب', 'type' => 'string', 'group' => 'platform', 'label' => 'الوصف المختصر'],
            ['key' => 'contact_email', 'value' => 'contact@footmanager.com', 'type' => 'string', 'group' => 'platform', 'label' => 'بريد التواصل'],
            ['key' => 'contact_phone', 'value' => '0600000000', 'type' => 'string', 'group' => 'platform', 'label' => 'هاتف التواصل'],
            ['key' => 'whatsapp_number', 'value' => '0600000000', 'type' => 'string', 'group' => 'platform', 'label' => 'رقم واتساب'],
            ['key' => 'facebook_url', 'value' => '', 'type' => 'string', 'group' => 'platform', 'label' => 'رابط فيسبوك'],
            ['key' => 'instagram_url', 'value' => '', 'type' => 'string', 'group' => 'platform', 'label' => 'رابط انستغرام'],
            ['key' => 'footer_text', 'value' => 'أجي نقصرو — منصة المباريات والملاعب', 'type' => 'string', 'group' => 'platform', 'label' => 'نص الفوتر'],

            // Feature toggles
            ['key' => 'registration_open', 'value' => '1', 'type' => 'boolean', 'group' => 'features', 'label' => 'فتح باب التسجيل'],
            ['key' => 'allow_mercenaries', 'value' => '1', 'type' => 'boolean', 'group' => 'features', 'label' => 'تفعيل حساب اللاعب الحر'],
            ['key' => 'maintenance_mode', 'value' => '0', 'type' => 'boolean', 'group' => 'features', 'label' => 'وضع الصيانة'],

            // Business rules
            ['key' => 'max_team_members', 'value' => '30', 'type' => 'number', 'group' => 'rules', 'label' => 'الحد الأقصى لأعضاء الفريق'],
            ['key' => 'max_open_matches_per_team', 'value' => '10', 'type' => 'number', 'group' => 'rules', 'label' => 'الحد الأقصى للمباريات المفتوحة لكل فريق'],
            ['key' => 'booking_window_days', 'value' => '30', 'type' => 'number', 'group' => 'rules', 'label' => 'نافذة الحجز (أيام)'],
            ['key' => 'default_match_hours', 'value' => '2', 'type' => 'number', 'group' => 'rules', 'label' => 'مدة المباراة الافتراضية (ساعات)'],

            // Announcement banner
            ['key' => 'announcement_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'announcement', 'label' => 'تفعيل الإعلان'],
            ['key' => 'announcement_text', 'value' => '', 'type' => 'string', 'group' => 'announcement', 'label' => 'نص الإعلان'],
            ['key' => 'announcement_type', 'value' => 'info', 'type' => 'string', 'group' => 'announcement', 'label' => 'نوع الإعلان'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
