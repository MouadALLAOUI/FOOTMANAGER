<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Stadium\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FacilityController extends Controller
{
    public function index(): JsonResponse
    {
        $facilities = Cache::remember(
            PublicCache::facilities(),
            (int) config('public.cache.facilities_ttl', 3600),
            fn () => Facility::orderBy('name')->get(),
        );

        return response()->json(['facilities' => $facilities]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'required|string|max:10',
        ]);

        $facility = Facility::create($validated);

        PublicCache::flushFacilities();

        return response()->json([
            'message' => 'تم إضافة المرفق بنجاح',
            'facility' => $facility,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $facility = Facility::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'icon' => 'sometimes|string|max:10',
        ]);

        $facility->update($validated);

        PublicCache::flushFacilities();

        return response()->json([
            'message' => 'تم تحديث المرفق بنجاح',
            'facility' => $facility->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $facility = Facility::findOrFail($id);
        $facility->terrains()->detach();
        $facility->delete();

        PublicCache::flushFacilities();
        PublicCache::flushTerrains();

        return response()->json([
            'message' => 'تم حذف المرفق بنجاح',
        ]);
    }
}
