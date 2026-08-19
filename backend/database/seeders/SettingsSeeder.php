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
            ['key' => 'platform_name', 'value' => 'أجي نقصرو', 'type' => 'string', 'group' => 'platform', 'label' => 'اسم المنصة', 'description' => 'اسم المنصة الظاهر في واجهة المستخدم والiping وال FOOTER'],
            ['key' => 'platform_tagline', 'value' => 'منصة تنظيم المباريات والملاعب', 'type' => 'string', 'group' => 'platform', 'label' => 'الوصف المختصر', 'description' => 'وصف مختصر للمنصة يظهر في الصفحة الرئيسية'],
            ['key' => 'contact_email', 'value' => 'contact@footmanager.com', 'type' => 'string', 'group' => 'platform', 'label' => 'بريد التواصل', 'description' => 'البريد الإلكتروني الرئيسي للتواصل مع المنصة'],
            ['key' => 'contact_phone', 'value' => '0600000000', 'type' => 'string', 'group' => 'platform', 'label' => 'هاتف التواصل', 'description' => 'رقم الهاتف الرئيسي للتواصل'],
            ['key' => 'whatsapp_number', 'value' => '0600000000', 'type' => 'string', 'group' => 'platform', 'label' => 'رقم واتساب', 'description' => 'رقم واتساب للدعم الفني'],
            ['key' => 'facebook_url', 'value' => '', 'type' => 'string', 'group' => 'platform', 'label' => 'رابط فيسبوك', 'description' => 'رابط صفحة فيسبوك الرسمية'],
            ['key' => 'instagram_url', 'value' => '', 'type' => 'string', 'group' => 'platform', 'label' => 'رابط انستغرام', 'description' => 'رابط حساب انستغرام الرسمي'],
            ['key' => 'contact_address', 'value' => '', 'type' => 'string', 'group' => 'platform', 'label' => 'عنوان التواصل', 'description' => 'العنوانPhysical للمنصة (اختياري)'],
            ['key' => 'working_hours', 'value' => '', 'type' => 'string', 'group' => 'platform', 'label' => 'ساعات العمل', 'description' => 'ساعات العمل مثال: 9 صباحاً - 6 مساءً'],
            ['key' => 'footer_text', 'value' => 'أجي نقصرو — منصة المباريات والملاعب', 'type' => 'string', 'group' => 'platform', 'label' => 'نص الفوتر', 'description' => 'النص الظاهر في أسفل الصفحة'],

            // Feature toggles
            ['key' => 'registration_open', 'value' => '1', 'type' => 'boolean', 'group' => 'features', 'label' => 'فتح باب التسجيل', 'description' => 'عند التعطيل، لن يتمكن المستخدمون الجدد من التسجيل'],
            ['key' => 'allow_mercenaries', 'value' => '1', 'type' => 'boolean', 'group' => 'features', 'label' => 'تفعيل حساب اللاعب الحر', 'description' => 'تفعيل نظام اللاعبين الأحرار للمباريات الودية'],
            ['key' => 'maintenance_mode', 'value' => '0', 'type' => 'boolean', 'group' => 'features', 'label' => 'وضع الصيانة', 'description' => 'عند التفعيل، المنصة تظهر صفحة صيانة للجميع ما عدا المسؤول'],

            // Business rules
            ['key' => 'max_team_members', 'value' => '30', 'type' => 'number', 'group' => 'rules', 'label' => 'الحد الأقصى لأعضاء الفريق', 'description' => 'الحد الأقصى لعدد اللاعبين في فريق واحد'],
            ['key' => 'max_open_matches_per_team', 'value' => '10', 'type' => 'number', 'group' => 'rules', 'label' => 'الحد الأقصى للمباريات المفتوحة لكل فريق', 'description' => 'الحد الأقصى للمباريات المفتوحة التي يمكن لكل فريق إنشاؤها'],
            ['key' => 'booking_window_days', 'value' => '30', 'type' => 'number', 'group' => 'rules', 'label' => 'نافذة الحجز (أيام)', 'description' => 'عدد الأيام المسموح بها للحجز مقدماً'],
            ['key' => 'default_match_hours', 'value' => '2', 'type' => 'number', 'group' => 'rules', 'label' => 'مدة المباراة الافتراضية (ساعات)', 'description' => 'المدة الافتراضية للمباراة بالساعات'],

            // Announcement banner
            ['key' => 'announcement_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'announcement', 'label' => 'تفعيل الإعلان', 'description' => 'تفعيل شريط الإعلانات في الصفحة الرئيسية'],
            ['key' => 'announcement_text', 'value' => '', 'type' => 'string', 'group' => 'announcement', 'label' => 'نص الإعلان', 'description' => 'نص الإعلان المطلوب عرضه'],
            ['key' => 'announcement_type', 'value' => 'info', 'type' => 'string', 'group' => 'announcement', 'label' => 'نوع الإعلان', 'description' => 'نوع الإعلان: معلومات أو تحذير أو نجاح'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
