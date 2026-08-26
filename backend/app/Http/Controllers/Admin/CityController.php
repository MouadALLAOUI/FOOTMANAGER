<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Models\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = City::query();

        if ($request->filled('status')) {
            $status = $request->string('status')->value();
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'hidden') {
                $query->where('is_active', false);
            }
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->value();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_fr', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $query->ordered();

        $perPage = min(max((int) $request->input('per_page', 15), 1), 50);

        $cities = $query->paginate($perPage)->withQueryString();

        $cities->getCollection()->transform(function ($city) {
            return [
                'id' => $city->id,
                'name' => $city->name,
                'name_ar' => $city->name_ar,
                'name_fr' => $city->name_fr,
                'name_en' => $city->name_en,
                'slug' => $city->slug,
                'is_active' => $city->is_active,
                'sort_order' => $city->sort_order,
                'localized_name' => $city->localized_name,
                'stadiums_count' => $city->stadiums()->count(),
                'teams_count' => $city->teams()->count(),
                'players_count' => $city->playerProfiles()->count(),
            ];
        });

        return response()->json($cities);
    }

    public function show(int $id): JsonResponse
    {
        $city = City::findOrFail($id);

        return response()->json([
            'id' => $city->id,
            'name' => $city->name,
            'name_ar' => $city->name_ar,
            'name_fr' => $city->name_fr,
            'name_en' => $city->name_en,
            'slug' => $city->slug,
            'is_active' => $city->is_active,
            'sort_order' => $city->sort_order,
            'localized_name' => $city->localized_name,
            'stadiums_count' => $city->stadiums()->count(),
            'teams_count' => $city->teams()->count(),
            'players_count' => $city->playerProfiles()->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:cities,name',
            'name_ar' => 'nullable|string|max:255',
            'name_fr' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $slug = Str::slug($validated['name']);

        if (City::where('slug', $slug)->exists()) {
            return response()->json([
                'message' => 'يوجد مدينة أخرى بنفس الاسم أو ما يعادله.',
                'errors' => ['name' => ['يوجد مدينة أخرى بنفس الاسم أو ما يعادله.']],
            ], 422);
        }

        $validated['slug'] = $slug;
        $validated['is_active'] = true;

        if (empty($validated['name_ar'])) {
            $validated['name_ar'] = $validated['name'];
        }

        $city = City::create($validated);

        return response()->json([
            'message' => 'تمت إضافة المدينة بنجاح',
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'name_ar' => $city->name_ar,
                'name_fr' => $city->name_fr,
                'name_en' => $city->name_en,
                'slug' => $city->slug,
                'is_active' => $city->is_active,
                'sort_order' => $city->sort_order,
                'localized_name' => $city->localized_name,
            ],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $city = City::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:cities,name,' . $city->id,
            'name_ar' => 'nullable|string|max:255',
            'name_fr' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['name'])) {
            $slug = Str::slug($validated['name']);

            $slugExists = City::where('slug', $slug)
                ->where('id', '!=', $city->id)
                ->exists();

            if ($slugExists) {
                return response()->json([
                    'message' => 'يوجد مدينة أخرى بنفس الاسم أو ما يعادله.',
                    'errors' => ['name' => ['يوجد مدينة أخرى بنفس الاسم أو ما يعادله.']],
                ], 422);
            }

            $validated['slug'] = $slug;
        }

        $city->update($validated);

        return response()->json([
            'message' => 'تم تحديث المدينة بنجاح',
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'name_ar' => $city->name_ar,
                'name_fr' => $city->name_fr,
                'name_en' => $city->name_en,
                'slug' => $city->slug,
                'is_active' => $city->is_active,
                'sort_order' => $city->sort_order,
                'localized_name' => $city->localized_name,
            ],
        ]);
    }

    public function toggleActive(int $id): JsonResponse
    {
        $city = City::findOrFail($id);
        $city->update(['is_active' => !$city->is_active]);

        return response()->json([
            'message' => $city->is_active ? 'تم إظهار المدينة بنجاح' : 'تم إخفاء المدينة بنجاح',
            'city' => [
                'id' => $city->id,
                'name' => $city->name,
                'is_active' => $city->is_active,
            ],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $city = City::findOrFail($id);

        $stadiumsCount = $city->stadiums()->count();
        $teamsCount = $city->teams()->count();
        $playersCount = $city->playerProfiles()->count();

        $totalRefs = $stadiumsCount + $teamsCount + $playersCount;

        if ($totalRefs > 0) {
            $parts = [];
            if ($stadiumsCount > 0) {
                $parts[] = "{$stadiumsCount} ملعب(ات)";
            }
            if ($teamsCount > 0) {
                $parts[] = "{$teamsCount} فريق(ות)";
            }
            if ($playersCount > 0) {
                $parts[] = "{$playersCount} لاعب(ين)";
            }

            return response()->json([
                'message' => 'هذه المدينة لا يمكن حذفها لأنها مرتبطة بـ' . implode(' و ', $parts) . '. يرجى استخدام خيار الإخفاء بدلاً من ذلك.',
            ], 422);
        }

        $city->delete();

        return response()->json([
            'message' => 'تم حذف المدينة بنجاح',
        ]);
    }
}
