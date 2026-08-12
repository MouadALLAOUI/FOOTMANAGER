<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainImage;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Stadium\Models\Stadium;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TerrainOwnerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $terrains = Stadium::with(['images', 'schedules', 'facilities'])
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
            'type' => 'required|in:salle,synthetic,cement,minifoot,grass',
            'player_format' => 'required|string|max:10',
            'has_benches' => 'boolean',
            'supports_tournaments' => 'boolean',
            'has_lighting' => 'boolean',
            'has_vestiaires' => 'boolean',
            'price_per_team' => 'required|numeric|min:0',
            'facility_ids' => 'nullable|array',
            'facility_ids.*' => 'exists:facilities,id',
        ]);

        $validated['owner_id'] = $request->user()->id;

        $terrain = Stadium::create($validated);

        if ($request->has('facility_ids')) {
            $terrain->facilities()->sync($validated['facility_ids']);
        }

        PublicCache::flushTerrains();

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
            'type' => 'sometimes|in:salle,synthetic,cement,minifoot,grass',
            'player_format' => 'sometimes|string|max:10',
            'has_benches' => 'boolean',
            'supports_tournaments' => 'boolean',
            'has_lighting' => 'boolean',
            'has_vestiaires' => 'boolean',
            'price_per_team' => 'sometimes|numeric|min:0',
            'is_available' => 'boolean',
            'facility_ids' => 'nullable|array',
            'facility_ids.*' => 'exists:facilities,id',
        ]);

        $terrain->update($validated);

        if ($request->has('facility_ids')) {
            $terrain->facilities()->sync($validated['facility_ids']);
        }

        PublicCache::flushTerrains();

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

        $hasFutureBookings = TerrainBooking::where('terrain_id', $terrain->id)
            ->whereIn('status', ['pending', 'confirmed', 'approved'])
            ->where(function ($q) {
                $q->where(function ($single) {
                    $single->where('reservation_type', '!=', 'weekly_subscription')
                        ->whereDate('booking_date', '>=', now()->toDateString());
                })->orWhere(function ($weekly) {
                    $weekly->where('reservation_type', 'weekly_subscription')
                        ->whereNotNull('end_date')
                        ->whereDate('end_date', '>=', now()->toDateString());
                });
            })
            ->exists();

        if ($hasFutureBookings) {
            return response()->json([
                'message' => 'لا يمكن حذف هذا الملعب لأنه يحتوي على حجوزات مستقبلية.',
            ], 422);
        }

        DB::transaction(function () use ($terrain) {
            foreach ($terrain->images as $image) {
                Storage::disk('public')->delete($image->image_path);
            }
            $terrain->images()->delete();
            $terrain->delete();
        });

        PublicCache::flushTerrains();

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
        ], [
            'images.required' => 'يجب اختيار صورة واحدة على الأقل',
            'images.array' => 'يجب إرسال الصور في صيغة صحيحة',
            'images.max' => 'الحد الأقصى هو 6 صور لكل ملعب',
            'images.*.image' => 'الملف المرفوع ليس صورة صالحة',
            'images.*.mimes' => 'صيغة الصورة غير مدعومة — يُسمح فقط بـ JPG أو PNG أو WEBP',
            'images.*.dimensions' => 'ملف الصورة تالف أو غير قابل للقراءة',
            'images.*.max' => 'حجم الصورة يتجاوز الحد الأقصى (5MB)',
            'images.*.uploaded' => 'فشل تحميل الصورة — حجمها أكبر من المسموح به',
        ]);

        $images = [];
        foreach ($request->file('images') as $file) {
            $thumbnail = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'terrains/images');
            $image = TerrainImage::create([
                'terrain_id' => $terrain->id,
                'image_path' => $thumbnail['path'],
                'thumbnail_path' => $thumbnail['thumbnail_path'],
            ]);
            $images[] = $image;
        }

        PublicCache::flushTerrains();

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

        if ($terrain->cover_image === $image->image_path) {
            $terrain->update(['cover_image' => null]);
        }

        PublicCache::flushTerrains();

        return response()->json([
            'message' => 'تم حذف الصورة بنجاح',
        ]);
    }

    public function setCover(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'image_id' => 'required|integer|exists:terrain_images,id',
        ]);

        $image = TerrainImage::where('terrain_id', $terrain->id)
            ->where('id', $validated['image_id'])
            ->firstOrFail();

        $terrain->images()->where('is_thumbnail', true)->update(['is_thumbnail' => false]);
        $image->update(['is_thumbnail' => true]);
        $terrain->update([
            'cover_image' => $image->image_path,
            'cover_thumbnail_path' => $image->thumbnail_path,
        ]);

        PublicCache::flushTerrains();

        return response()->json([
            'message' => 'تم تعيين الصورة كصورة مصغرة للملعب بنجاح',
            'terrain' => $terrain->fresh()->load(['images', 'schedules', 'facilities']),
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $ownerId = $request->user()->id;

        $terrainAgg = Stadium::where('owner_id', $ownerId)
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN is_available THEN 1 ELSE 0 END) as available')
            ->first();

        $matchAgg = DB::table('match_requests')
            ->whereIn('stadium_id', function ($q) use ($ownerId) {
                $q->select('id')->from('stadiums')->where('owner_id', $ownerId);
            })
            ->whereIn('status', ['accepted', 'open'])
            ->selectRaw("SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as booked, SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as pending")
            ->first();

        $totalRevenue = DB::table('terrain_bookings')
            ->where('status', 'approved')
            ->whereIn('terrain_id', function ($q) use ($ownerId) {
                $q->select('id')->from('stadiums')->where('owner_id', $ownerId);
            })
            ->sum('price');

        return response()->json([
            'stats' => [
                'total_terrains' => (int) ($terrainAgg->total ?? 0),
                'available_terrains' => (int) ($terrainAgg->available ?? 0),
                'booked_matches' => (int) ($matchAgg->booked ?? 0),
                'pending_matches' => (int) ($matchAgg->pending ?? 0),
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

    public function overviewAnalytics(Request $request): JsonResponse
    {
        $mode = $request->query('mode', 'weekly');
        if (! in_array($mode, ['weekly', 'monthly', 'yearly'], true)) {
            $mode = 'weekly';
        }

        $terrainIds = Stadium::where('owner_id', $request->user()->id)->pluck('id');

        if ($terrainIds->isEmpty()) {
            return response()->json(['series' => [], 'occupancy' => 0, 'counts' => (object) []]);
        }

        $now = Carbon::now();

        // Current week of the month (month sliced into 7-day blocks from the 1st)
        $weekIndex = (int) floor(($now->day - 1) / 7);
        $monthWeekStart = $now->copy()->startOfMonth()->addDays($weekIndex * 7);

        // Build chart buckets:
        // weekly  -> the 7 days of the current month week
        // monthly -> every day of the current month (1st to last)
        // yearly  -> the 12 months of the current year
        $buckets = [];
        $ranges = [];
        $minStart = null;
        $maxEnd = null;

        if ($mode === 'weekly') {
            for ($i = 0; $i < 7; $i++) {
                $date = $monthWeekStart->copy()->addDays($i);
                $key = $date->toDateString();
                $buckets[] = $key;
                $ranges[$key] = [$key, $key];
            }
        } elseif ($mode === 'monthly') {
            $daysInMonth = $now->copy()->daysInMonth;
            for ($day = 1; $day <= $daysInMonth; $day++) {
                $date = $now->copy()->startOfMonth()->addDays($day - 1);
                $key = $date->toDateString();
                $buckets[] = $key;
                $ranges[$key] = [$key, $key];
            }
        } else {
            $year = $now->year;
            for ($month = 1; $month <= 12; $month++) {
                $key = sprintf('%04d-%02d', $year, $month);
                $start = Carbon::create($year, $month, 1);
                $buckets[] = $key;
                $ranges[$key] = [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
            }
        }

        foreach ($ranges as [$r0, $r1]) {
            $minStart = $minStart === null ? $r0 : min($minStart, $r0);
            $maxEnd = $maxEnd === null ? $r1 : max($maxEnd, $r1);
        }

        $currentWeekStart = $monthWeekStart->toDateString();
        $currentWeekEnd = $monthWeekStart->copy()->addDays(6)->toDateString();
        $countsStart = Carbon::parse($currentWeekStart)->subWeeks(7)->toDateString();
        $countsEnd = $currentWeekEnd;

        // Use raw SQL for efficient aggregation
        // We'll build a UNION query for single bookings and expanded weekly subscriptions
        // then aggregate by bucket in SQL

        $terrainIdsSql = implode(',', $terrainIds->toArray());
        $minStartSql = DB::connection()->getPdo()->quote($minStart);
        $maxEndSql = DB::connection()->getPdo()->quote($maxEnd);
        $countsStartSql = DB::connection()->getPdo()->quote($countsStart);
        $countsEndSql = DB::connection()->getPdo()->quote($countsEnd);
        $currentWeekStartSql = DB::connection()->getPdo()->quote($currentWeekStart);
        $currentWeekEndSql = DB::connection()->getPdo()->quote($currentWeekEnd);

        // Get schedules with slot duration for each terrain/day
        $schedules = TerrainSchedule::whereIn('terrain_id', $terrainIds)
            ->where('is_active', true)
            ->get()
            ->keyBy(fn ($s) => $s->terrain_id.'-'.$s->day_of_week);

        $slotCount = function (string $startTime, string $endTime, int $terrainId, int $dayOfWeek) use ($schedules) {
            $s = Carbon::parse($startTime);
            $e = Carbon::parse($endTime);
            $minutes = max(60, $s->diffInMinutes($e));
            $duration = (int) ($schedules->get($terrainId.'-'.$dayOfWeek)?->slot_duration_minutes ?? 60);
            return max(1, (int) ceil($minutes / max(60, $duration)));
        };

        // Fetch all relevant bookings in one go with minimal columns
        $singles = TerrainBooking::whereIn('terrain_id', $terrainIds)
            ->where('reservation_type', 'single')
            ->whereIn('status', ['pending', 'approved'])
            ->whereBetween('booking_date', [$minStart, $maxEnd])
            ->get(['terrain_id', 'booking_date', 'start_time', 'end_time', 'price']);

        $countsSingles = TerrainBooking::whereIn('terrain_id', $terrainIds)
            ->where('reservation_type', 'single')
            ->whereIn('status', ['pending', 'approved'])
            ->whereBetween('booking_date', [$countsStart, $countsEnd])
            ->get(['terrain_id', 'booking_date', 'start_time', 'end_time', 'price']);

        $subscriptions = TerrainBooking::whereIn('terrain_id', $terrainIds)
            ->where('reservation_type', 'weekly_subscription')
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($maxEnd) {
                $q->whereNull('start_date')->orWhere('start_date', '<=', $maxEnd);
            })
            ->where(function ($q) use ($minStart) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $minStart);
            })
            ->get(['terrain_id', 'day_of_week', 'start_date', 'end_date', 'start_time', 'end_time', 'price']);

        $agg = array_fill_keys($buckets, ['revenue' => 0, 'bookings' => 0]);

        // Process singles - single loop over bookings
        foreach ($singles as $booking) {
            $date = $booking->booking_date?->toDateString();
            if (! $date) continue;

            // Find the bucket this date belongs to (only one for daily buckets)
            $slots = $slotCount($booking->start_time, $booking->end_time, $booking->terrain_id, $booking->booking_date->dayOfWeek % 7);
            if (isset($agg[$date])) {
                $agg[$date]['revenue'] += (float) $booking->price * $slots;
                $agg[$date]['bookings'] += $slots;
            }
        }

        // Process subscriptions - expand into occurrences
        foreach ($subscriptions as $sub) {
            $dow = (int) $sub->day_of_week;
            if ($dow < 1 || $dow > 7) continue;

            $price = (float) $sub->price;
            $slotsPerOccurrence = $slotCount($sub->start_time, $sub->end_time, $sub->terrain_id, $dow);
            $occurrenceRevenue = $price * $slotsPerOccurrence;

            // Calculate which buckets this subscription contributes to
            // For weekly: only current week's matching day
            // For monthly: all matching days in the month
            // For yearly: all matching months

            if ($mode === 'weekly') {
                // Only the current week's day matching the subscription's day_of_week
                $targetDate = Carbon::parse($currentWeekStart)->addDays(($dow - 1) - Carbon::parse($currentWeekStart)->dayOfWeek + 7) % 7;
                $key = $targetDate->toDateString();
                if (isset($agg[$key])) {
                    $agg[$key]['revenue'] += $occurrenceRevenue;
                    $agg[$key]['bookings'] += $slotsPerOccurrence;
                }
            } elseif ($mode === 'monthly') {
                // All occurrences of this day of week in the current month
                $monthStart = $now->copy()->startOfMonth();
                $monthEnd = $now->copy()->endOfMonth();
                $cursor = $monthStart->copy()->addDays(($dow - $monthStart->dayOfWeek + 7) % 7);
                $firstOccurrence = $cursor->copy();
                if ($sub->start_date && $firstOccurrence->lt($sub->start_date)) {
                    $firstOccurrence = $sub->start_date->copy();
                    $cursor = $firstOccurrence->copy();
                }
                while ($cursor->lte($monthEnd)) {
                    if ($sub->end_date && $cursor->gt($sub->end_date)) break;
                    $key = $cursor->toDateString();
                    if (isset($agg[$key])) {
                        $agg[$key]['revenue'] += $occurrenceRevenue;
                        $agg[$key]['bookings'] += $slotsPerOccurrence;
                    }
                    $cursor->addWeek();
                }
            } else { // yearly
                $year = $now->year;
                for ($month = 1; $month <= 12; $month++) {
                    $monthStart = Carbon::create($year, $month, 1);
                    $monthEnd = $monthStart->copy()->endOfMonth();
                    $cursor = $monthStart->copy()->addDays(($dow - $monthStart->dayOfWeek + 7) % 7);
                    $firstOccurrence = $cursor->copy();
                    if ($sub->start_date && $firstOccurrence->lt($sub->start_date)) {
                        $firstOccurrence = $sub->start_date->copy();
                        $cursor = $firstOccurrence->copy();
                    }
                    while ($cursor->lte($monthEnd)) {
                        if ($sub->end_date && $cursor->gt($sub->end_date)) break;
                        $key = sprintf('%04d-%02d', $year, $month);
                        if (isset($agg[$key])) {
                            $agg[$key]['revenue'] += $occurrenceRevenue;
                            $agg[$key]['bookings'] += $slotsPerOccurrence;
                        }
                        $cursor->addWeek();
                    }
                }
            }
        }

        $series = [];
        foreach ($buckets as $key) {
            $series[] = [
                'key' => $key,
                'revenue' => (int) round($agg[$key]['revenue']),
                'bookings' => $agg[$key]['bookings'],
            ];
        }

        // Occupancy for the current week (booked slots / total generated slots)
        $occBooked = 0;
        $occAvailable = 0;

        // Total available slots from schedules for current week
        foreach ($terrainIds as $tid) {
            for ($d = Carbon::parse($currentWeekStart); $d->lte(Carbon::parse($currentWeekEnd)); $d->addDay()) {
                $schedule = $schedules->get($tid.'-'.($d->dayOfWeek % 7));
                if (! $schedule) continue;
                $duration = (int) ($schedule->slot_duration_minutes ?: 60);
                $occAvailable += (int) max(0, ceil(
                    Carbon::parse($schedule->open_time)->diffInMinutes(Carbon::parse($schedule->close_time)) / max(60, $duration)
                ));
            }
        }

        // Booked slots from singles in current week
        foreach ($singles as $booking) {
            $date = $booking->booking_date?->toDateString();
            if ($date >= $currentWeekStart && $date <= $currentWeekEnd) {
                $occBooked += $slotCount($booking->start_time, $booking->end_time, $booking->terrain_id, $booking->booking_date->dayOfWeek % 7);
            }
        }

        // Booked slots from subscriptions in current week
        foreach ($subscriptions as $sub) {
            $dow = (int) $sub->day_of_week;
            if ($dow < 1 || $dow > 7) continue;

            $cursor = Carbon::parse($currentWeekStart);
            if ($sub->start_date && $sub->start_date->gt($cursor)) {
                $cursor = $sub->start_date->copy();
            }
            $shift = ($dow - $cursor->dayOfWeek + 7) % 7;
            $cursor->addDays($shift);

            while ($cursor->toDateString() <= $currentWeekEnd) {
                if ($sub->end_date && $cursor->gt($sub->end_date)) break;
                $occBooked += $slotCount($sub->start_time, $sub->end_time, $sub->terrain_id, $dow);
                $cursor->addWeek();
            }
        }

        $occupancy = $occBooked + $occAvailable > 0 ? (int) round($occBooked / ($occBooked + $occAvailable) * 100) : 0;

        // Popular terrain: bookings per terrain over past 8 weeks
        $popular = [];

        foreach ($countsSingles as $booking) {
            $date = $booking->booking_date?->toDateString();
            if (! $date) continue;
            $popular[$booking->terrain_id] = ($popular[$booking->terrain_id] ?? 0)
                + $slotCount($booking->start_time, $booking->end_time, $booking->terrain_id, $booking->booking_date->dayOfWeek % 7);
        }

        foreach ($subscriptions as $sub) {
            $dow = (int) $sub->day_of_week;
            if ($dow < 1 || $dow > 7 || ($sub->start_date && $sub->start_date->toDateString() > $countsEnd)
                || ($sub->end_date && $sub->end_date->toDateString() < $countsStart)) {
                continue;
            }

            $cursor = Carbon::parse($countsStart);
            if ($sub->start_date && $sub->start_date->gt($cursor)) {
                $cursor = $sub->start_date->copy();
            }
            $shift = ($dow - $cursor->dayOfWeek + 7) % 7;
            $cursor->addDays($shift);

            while ($cursor->toDateString() <= $countsEnd) {
                if ($sub->end_date && $cursor->gt($sub->end_date)) break;
                $popular[$sub->terrain_id] = ($popular[$sub->terrain_id] ?? 0)
                    + $slotCount($sub->start_time, $sub->end_time, $sub->terrain_id, $dow);
                $cursor->addWeek();
            }
        }

        $counts = [];
        foreach ($terrainIds as $tid) {
            $counts[(string) $tid] = $popular[$tid] ?? 0;
        }

        return response()->json([
            'series' => $series,
            'occupancy' => $occupancy,
            'counts' => (object) $counts,
        ]);
    }
}
