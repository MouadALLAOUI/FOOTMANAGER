<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Stadium;
use App\Models\TerrainImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TerrainOwnerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $terrains = Stadium::with(['images', 'facilities'])
            ->where('owner_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['terrains' => $terrains]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::with(['images', 'schedules', 'facilities'])
            ->where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json(['terrain' => $terrain]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'google_maps_url' => 'nullable|url|max:500',
            'type' => 'required|in:minifoot,salle,grass,synthetic',
            'player_format' => 'required|string|max:10',
            'has_benches' => 'boolean',
            'supports_tournaments' => 'boolean',
            'has_lighting' => 'boolean',
            'has_vestiaires' => 'boolean',
            'price_per_team' => 'required|numeric|min:0',
            'total_price' => 'required|numeric|min:0',
            'facility_ids' => 'nullable|array',
            'facility_ids.*' => 'exists:facilities,id',
        ]);

        $validated['owner_id'] = $request->user()->id;

        $terrain = Stadium::create($validated);

        if ($request->has('facility_ids')) {
            $terrain->facilities()->sync($validated['facility_ids']);
        }

        return response()->json([
            'message' => 'تم إضافة الملعب بنجاح',
            'terrain' => $terrain->fresh()->load(['images', 'facilities']),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'address' => 'nullable|string|max:255',
            'google_maps_url' => 'nullable|url|max:500',
            'type' => 'sometimes|in:minifoot,salle,grass,synthetic',
            'player_format' => 'sometimes|string|max:10',
            'has_benches' => 'boolean',
            'supports_tournaments' => 'boolean',
            'has_lighting' => 'boolean',
            'has_vestiaires' => 'boolean',
            'price_per_team' => 'sometimes|numeric|min:0',
            'total_price' => 'sometimes|numeric|min:0',
            'is_available' => 'boolean',
            'facility_ids' => 'nullable|array',
            'facility_ids.*' => 'exists:facilities,id',
        ]);

        $terrain->update($validated);

        if ($request->has('facility_ids')) {
            $terrain->facilities()->sync($validated['facility_ids']);
        }

        return response()->json([
            'message' => 'تم تحديث بيانات الملعب بنجاح',
            'terrain' => $terrain->fresh()->load(['images', 'facilities']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        DB::transaction(function () use ($terrain) {
            foreach ($terrain->images as $image) {
                Storage::disk('public')->delete($image->image_path);
            }
            $terrain->images()->delete();
            $terrain->delete();
        });

        return response()->json([
            'message' => 'تم حذف الملعب بنجاح',
        ]);
    }

    public function uploadImages(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $request->validate([
            'images' => 'required|array|max:6',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $images = [];
        foreach ($request->file('images') as $file) {
            $path = $file->store('terrains/images', 'public');
            $image = TerrainImage::create([
                'terrain_id' => $terrain->id,
                'image_path' => $path,
            ]);
            $images[] = $image;
        }

        return response()->json([
            'message' => 'تم رفع الصور بنجاح',
            'images' => $images,
        ], 201);
    }

    public function destroyImage(Request $request, int $terrainId, int $imageId): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $terrainId)
            ->firstOrFail();

        $image = TerrainImage::where('terrain_id', $terrain->id)
            ->where('id', $imageId)
            ->firstOrFail();

        Storage::disk('public')->delete($image->image_path);
        $image->delete();

        return response()->json([
            'message' => 'تم حذف الصورة بنجاح',
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $ownerId = $request->user()->id;

        $totalTerrains = Stadium::where('owner_id', $ownerId)->count();
        $availableTerrains = Stadium::where('owner_id', $ownerId)->where('is_available', true)->count();

        $bookedMatches = DB::table('match_requests')
            ->where('status', 'accepted')
            ->whereIn('stadium_id', function ($q) use ($ownerId) {
                $q->select('id')->from('stadiums')->where('owner_id', $ownerId);
            })
            ->count();

        $pendingMatches = DB::table('match_requests')
            ->where('status', 'open')
            ->whereIn('stadium_id', function ($q) use ($ownerId) {
                $q->select('id')->from('stadiums')->where('owner_id', $ownerId);
            })
            ->count();

        $totalRevenue = DB::table('terrain_bookings')
            ->where('status', 'approved')
            ->whereIn('terrain_id', function ($q) use ($ownerId) {
                $q->select('id')->from('stadiums')->where('owner_id', $ownerId);
            })
            ->sum('price');

        return response()->json([
            'stats' => [
                'total_terrains' => $totalTerrains,
                'available_terrains' => $availableTerrains,
                'booked_matches' => $bookedMatches,
                'pending_matches' => $pendingMatches,
                'total_revenue' => $totalRevenue ?? 0,
            ],
        ]);
    }

    public function upcomingBookings(Request $request): JsonResponse
    {
        $terrainIds = Stadium::where('owner_id', $request->user()->id)->pluck('id');

        $bookings = DB::table('match_requests')
            ->whereIn('stadium_id', $terrainIds)
            ->whereIn('status', ['open', 'accepted'])
            ->orderBy('match_datetime', 'asc')
            ->limit(20)
            ->get();

        return response()->json(['bookings' => $bookings]);
    }
}
