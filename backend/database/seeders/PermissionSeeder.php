<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['slug' => 'users.view', 'name' => 'عرض المستخدمين', 'group' => 'users'],
            ['slug' => 'users.manage', 'name' => 'إدارة المستخدمين', 'group' => 'users'],
            ['slug' => 'users.accounts', 'name' => 'إدارة الحسابات', 'group' => 'users'],
            ['slug' => 'analytics.view', 'name' => 'عرض التحليلات', 'group' => 'analytics'],
            ['slug' => 'settings.view', 'name' => 'عرض الإعدادات', 'group' => 'settings'],
            ['slug' => 'settings.manage', 'name' => 'إدارة الإعدادات', 'group' => 'settings'],
            ['slug' => 'messages.view', 'name' => 'عرض الرسائل', 'group' => 'messages'],
            ['slug' => 'messages.manage', 'name' => 'إدارة الرسائل', 'group' => 'messages'],
            ['slug' => 'moderation.view', 'name' => 'عرض الإشراف', 'group' => 'moderation'],
            ['slug' => 'moderation.manage', 'name' => 'إدارة الإشراف', 'group' => 'moderation'],
            ['slug' => 'facilities.view', 'name' => 'عرض المرافق', 'group' => 'facilities'],
            ['slug' => 'facilities.manage', 'name' => 'إدارة المرافق', 'group' => 'facilities'],
            ['slug' => 'cities.view', 'name' => 'عرض المدن', 'group' => 'cities'],
            ['slug' => 'cities.manage', 'name' => 'إدارة المدن', 'group' => 'cities'],
            ['slug' => 'plans.view', 'name' => 'عرض الخطط', 'group' => 'plans'],
            ['slug' => 'plans.manage', 'name' => 'إدارة الخطط', 'group' => 'plans'],
            ['slug' => 'activity.view', 'name' => 'عرض النشاط', 'group' => 'activity'],
            ['slug' => 'admin.manage', 'name' => 'إدارة المسؤولين', 'group' => 'admin'],
        ];

        foreach ($permissions as $perm) {
            Permission::updateOrCreate(
                ['slug' => $perm['slug']],
                ['name' => $perm['name'], 'group' => $perm['group']]
            );
        }
    }
}
