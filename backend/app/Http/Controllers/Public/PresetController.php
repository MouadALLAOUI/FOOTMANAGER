<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Models\Preset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $category = $request->string('category')->value();

        if (! in_array($category, [Preset::CATEGORY_TEAM_LOGO, Preset::CATEGORY_PROFILE_AVATAR], true)) {
            return response()->json([]);
        }

        $presets = Preset::query()
            ->active()
            ->category($category)
            ->ordered()
            ->get()
            ->map(fn (Preset $preset) => [
                'id' => $preset->id,
                'name' => $preset->name,
                'category' => $preset->category,
                'image_url' => $preset->image_url,
                'image_thumbnail_url' => $preset->image_thumbnail_url,
            ])
            ->values();

        return response()->json(['data' => $presets]);
    }
}