<?php

namespace App\Domains\Stadium\Queries;

use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class StadiumQuery
{
    public const HAVERSINE = '(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))';

    public static function base(): Builder
    {
        return Stadium::with(['images', 'facilities'])
            ->where('is_available', true)
            ->where('is_open', true)
            ->whereHas('owner', function ($q) {
                $q->where('status', 'approved');
            });
    }

    public static function applyFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('q')) {
            $search = trim($request->query('q'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('city_id')) {
            $query->where('city_id', $request->query('city_id'));
        } elseif ($request->filled('city')) {
            // Legacy support: filter by city string (for backward compatibility)
            $query->where('city', $request->query('city'));
        }

        if ($request->filled('player_format')) {
            $query->where('player_format', $request->query('player_format'));
        }

        if ($request->filled('coverage')) {
            if ($request->query('coverage') === 'covered') {
                $query->where('is_covered', true);
            } elseif ($request->query('coverage') === 'outdoor') {
                $query->where('is_covered', false);
            }
        }

        if ($request->filled('facilities')) {
            $facilities = is_array($request->query('facilities'))
                ? $request->query('facilities')
                : explode(',', $request->query('facilities'));

            $query->whereHas('facilities', function ($q) use ($facilities) {
                $q->whereIn('facility_id', $facilities);
            });
        }

        if ($request->filled('min_price')) {
            $query->where('price_per_hour', '>=', $request->query('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price_per_hour', '<=', $request->query('max_price'));
        }

        self::applyDistanceFilter($query, $request);
        self::applySorting($query, $request);

        return $query;
    }

    private static function applyDistanceFilter(Builder $query, Request $request): Builder
    {
        $lat = $request->filled('lat') ? (float) $request->query('lat') : null;
        $lng = $request->filled('lng') ? (float) $request->query('lng') : null;

        if ($lat === null || $lng === null) {
            return $query;
        }

        $query->selectRaw('*, '.self::HAVERSINE.' AS distance', [$lat, $lng, $lat]);

        if ($request->filled('radius')) {
            $radius = (float) $request->query('radius');
            $query->whereRaw(self::HAVERSINE.' <= ?', [$lat, $lng, $lat, $radius]);
        }

        return $query;
    }

    private static function applySorting(Builder $query, Request $request): Builder
    {
        $sort = $request->query('sort', 'rating');

        switch ($sort) {
            case 'distance':
                if ($request->filled('lat') && $request->filled('lng')) {
                    $query->orderBy('distance', 'asc');
                }
                break;
            case 'price_asc':
                $query->orderByRaw('price_per_hour IS NULL, price_per_hour ASC');
                break;
            case 'price_desc':
                $query->orderByRaw('price_per_hour IS NULL, price_per_hour DESC');
                break;
            case 'newest':
                $query->orderByDesc('created_at');
                break;
            default:
                $query->orderByDesc('rating')->orderByDesc('reviews_count');
                break;
        }

        return $query;
    }
}
