<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use App\Models\MaintenanceModule;
use App\Models\PageMaintenance;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingsController extends Controller
{
    public const GROUPS = ['platform', 'features', 'rules', 'announcement'];

    public function index(): JsonResponse
    {
        $settings = Setting::orderBy('group')->orderBy('id')->get();

        $grouped = collect(self::GROUPS)
            ->mapWithKeys(fn ($group) => [$group => $settings->where('group', $group)->values()])
            ->all();

        return response()->json(['settings' => $grouped]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string|exists:settings,key',
            'settings.*.value' => 'nullable',
        ]);

        foreach ($request->settings as $item) {
            $setting = Setting::where('key', $item['key'])->first();

            $value = $item['value'];

            if ($setting->type === 'boolean') {
                $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
            } elseif ($setting->type === 'number') {
                $value = $value === null || $value === '' ? null : (float) $value;
            } elseif ($setting->type === 'json' && is_array($value)) {
                $value = json_encode($value);
            }

            $setting->update(['value' => $value]);
        }

        PublicCache::flushSettings();

        return response()->json([
            'message' => 'تم حفظ الإعدادات بنجاح',
            'settings' => Setting::orderBy('group')->orderBy('id')->get(),
        ]);
    }

    public function publicSettings(): JsonResponse
    {
        $settings = Cache::remember(
            PublicCache::settings(),
            (int) config('public.cache.settings_ttl', 300),
            fn () => Setting::whereIn('group', ['platform', 'announcement'])
                ->orWhere('key', 'maintenance_mode')
                ->get(),
        );

        $moduleMaintenance = Cache::remember(
            PublicCache::moduleMaintenance(),
            (int) config('public.cache.settings_ttl', 300),
            fn () => MaintenanceModule::getActiveModules(),
        );

        $pageMaintenance = Cache::remember(
            PublicCache::pageMaintenance(),
            (int) config('public.cache.settings_ttl', 300),
            fn () => PageMaintenance::getActivePages(),
        );

        return response()->json([
            'settings' => $settings->mapWithKeys(fn (Setting $setting) => [
                $setting->key => $setting->value,
            ]),
            'module_maintenance' => $moduleMaintenance,
            'page_maintenance' => $pageMaintenance,
        ]);
    }

    public function maintenanceIndex(): JsonResponse
    {
        $modules = MaintenanceModule::orderBy('module')->get();

        return response()->json(['modules' => $modules]);
    }

    public function maintenanceUpdate(Request $request, string $module): JsonResponse
    {
        $request->validate([
            'enabled' => 'required|boolean',
            'message' => 'nullable|string|max:500',
            'block_reads' => 'required|boolean',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
        ]);

        $userId = $request->user()->id;

        $maintenance = MaintenanceModule::updateOrCreate(
            ['module' => $module],
            [
                'enabled' => $request->boolean('enabled'),
                'block_reads' => $request->boolean('block_reads'),
                'message' => $request->input('message'),
                'starts_at' => $request->input('starts_at'),
                'ends_at' => $request->input('ends_at'),
                'created_by' => $userId,
                'updated_by' => $userId,
            ],
        );

        PublicCache::flushModuleMaintenance();

        return response()->json([
            'message' => $maintenance->wasRecentlyCreated
                ? 'تم إنشاء إعداد الصيانة'
                : 'تم تحديث إعداد الصيانة',
            'module' => $maintenance,
        ]);
    }

    public function maintenanceDestroy(string $module): JsonResponse
    {
        $maintenance = MaintenanceModule::where('module', $module)->first();

        if (! $maintenance) {
            return response()->json(['message' => 'إعداد الصيانة غير موجود'], 404);
        }

        $maintenance->delete();

        PublicCache::flushModuleMaintenance();

        return response()->json(['message' => 'تم حذف إعداد الصيانة']);
    }

    public function pageMaintenanceIndex(): JsonResponse
    {
        $pages = PageMaintenance::orderBy('path')->get();

        return response()->json(['pages' => $pages]);
    }

    public function pageMaintenanceUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'path' => 'required|string|max:255',
            'enabled' => 'required|boolean',
            'message' => 'nullable|string|max:500',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
        ]);

        $userId = $request->user()->id;
        $path = $request->input('path');

        $page = PageMaintenance::updateOrCreate(
            ['path' => $path],
            [
                'enabled' => $request->boolean('enabled'),
                'message' => $request->input('message'),
                'starts_at' => $request->input('starts_at'),
                'ends_at' => $request->input('ends_at'),
                'created_by' => $userId,
                'updated_by' => $userId,
            ],
        );

        PublicCache::flushPageMaintenance();

        return response()->json([
            'message' => $page->wasRecentlyCreated
                ? 'تم إنشاء إعداد صيانة الصفحة'
                : 'تم تحديث إعداد صيانة الصفحة',
            'page' => $page,
        ]);
    }

    public function pageMaintenanceDestroy(Request $request): JsonResponse
    {
        $request->validate([
            'path' => 'required|string|max:255',
        ]);

        $page = PageMaintenance::where('path', $request->input('path'))->first();

        if (! $page) {
            return response()->json(['message' => 'إعداد صيانة الصفحة غير موجود'], 404);
        }

        $page->delete();

        PublicCache::flushPageMaintenance();

        return response()->json(['message' => 'تم حذف إعداد صيانة الصفحة']);
    }
}
