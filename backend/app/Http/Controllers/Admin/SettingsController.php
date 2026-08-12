<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
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
            fn () => Setting::whereIn('group', ['platform', 'announcement'])->get(),
        );

        return response()->json([
            'settings' => $settings->mapWithKeys(fn (Setting $setting) => [
                $setting->key => $setting->value,
            ]),
        ]);
    }
}
