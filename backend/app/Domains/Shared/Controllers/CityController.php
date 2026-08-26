<?php

namespace App\Domains\Shared\Controllers;

use App\Domains\Shared\Models\City;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = City::query();

        // Only active cities by default
        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        // Optional search
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

        // Order
        $query->ordered();

        // Pagination
        $perPage = (int) $request->input('per_page', 50);
        $perPage = min($perPage, 200);

        $cities = $query->paginate($perPage);

        // Transform to include localized name
        $cities->getCollection()->transform(function ($city) {
            return [
                'id' => $city->id,
                'name' => $city->name,
                'name_ar' => $city->name_ar,
                'name_fr' => $city->name_fr,
                'name_en' => $city->name_en,
                'slug' => $city->slug,
                'localized_name' => $city->localized_name,
            ];
        });

        return response()->json($cities);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $city = City::findOrFail($id);

        return response()->json([
            'id' => $city->id,
            'name' => $city->name,
            'name_ar' => $city->name_ar,
            'name_fr' => $city->name_fr,
            'name_en' => $city->name_en,
            'slug' => $city->slug,
            'localized_name' => $city->localized_name,
        ]);
    }

    public function listForSelect(Request $request): JsonResponse
    {
        $query = City::query();

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        $cities = $query->ordered()
            ->get(['id', 'name', 'name_ar', 'name_fr', 'name_en', 'slug'])
            ->map(function ($city) {
                return [
                    'id' => $city->id,
                    'name' => $city->name,
                    'localized_name' => $city->localized_name,
                    'slug' => $city->slug,
                ];
            });

        return response()->json(['cities' => $cities]);
    }
}