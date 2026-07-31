<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\MatchRequest;
use App\Models\Stadium;
use App\Models\TerrainBooking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MatchRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $status = $request->query('status');

        $query = MatchRequest::with(['stadium.images', 'hostTeam', 'opponentTeam.manager', 'targetTeam'])
            ->where(function ($q) use ($teamId) {
                $q->where('host_team_id', $teamId)
                  ->orWhere('opponent_team_id', $teamId);
            });

        if ($status) {
            $query->where('status', $status);
        }

        $requests = $query->latest('match_datetime')->get();

        return response()->json(['match_requests' => $requests]);
    }

    public function receivedChallenges(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $challenges = MatchRequest::with(['hostTeam.manager', 'stadium.images', 'targetTeam'])
            ->where('target_team_id', $teamId)
            ->where('type', 'direct_challenge')
            ->where('status', 'open')
            ->whereHas('hostTeam.manager', function ($q) {
                $q->where('status', 'approved');
            })
            ->latest('match_datetime')
            ->get();

        return response()->json(['challenges' => $challenges]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'stadium_id' => 'nullable|exists:stadiums,id',
            'custom_terrain_name' => 'nullable|string|max:255',
            'match_datetime' => 'required|date|after:now',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'reservation_type' => 'sometimes|in:single,weekly_subscription',
            'day_of_week' => 'nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:500',
            'price_per_player' => 'nullable|numeric|min:0',
        ]);

        if (empty($validated['stadium_id']) && empty($validated['custom_terrain_name'])) {
            return response()->json([
                'message' => 'يجب اختيار ملعب أو كتابة اسم ملعب',
            ], 422);
        }

        $matchRequest = MatchRequest::create([
            'host_team_id' => $user->team->id,
            'stadium_id' => $validated['stadium_id'] ?? null,
            'custom_terrain_name' => $validated['custom_terrain_name'] ?? null,
            'match_datetime' => $validated['match_datetime'],
            'notes' => $validated['notes'] ?? null,
            'price_per_player' => $validated['price_per_player'] ?? null,
        ]);

        if (!empty($validated['stadium_id'])) {
            $terrain = Stadium::find($validated['stadium_id']);

            if (!$terrain->is_open) {
                return response()->json([
                    'message' => 'الملعب مغلق حالياً — لا يمكن إرسال طلب المباراة',
                ], 422);
            }

            $isWeekly = ($validated['reservation_type'] ?? 'single') === 'weekly_subscription';
            $checkDate = $isWeekly
                ? ($validated['start_date'] ?? $validated['match_datetime'])
                : ($validated['start_date'] ?? date('Y-m-d', strtotime($validated['match_datetime'])));

            $conflictMsg = TerrainBooking::getConflictMessage(
                $validated['stadium_id'],
                $checkDate,
                $validated['start_time'],
                $validated['end_time'],
                $user->id
            );

            if ($conflictMsg) {
                return response()->json(['message' => $conflictMsg], 422);
            }

            $price = $terrain->price_per_team ?? 0;

            if ($isWeekly && !empty($validated['end_date'])) {
                $weeks = (int) ceil(Carbon::parse($validated['start_date'])->diffInWeeks(Carbon::parse($validated['end_date'])));
                $price = $price * max($weeks, 1);
            }

            TerrainBooking::create([
                'terrain_id' => $validated['stadium_id'],
                'manager_id' => $user->id,
                'team_id' => $user->team->id,
                'booking_type' => 'match',
                'flow_type' => 'amical',
                'reservation_type' => $validated['reservation_type'] ?? 'single',
                'match_request_id' => $matchRequest->id,
                'booking_date' => $checkDate,
                'day_of_week' => $isWeekly ? ($validated['day_of_week'] ?? null) : null,
                'start_date' => $isWeekly ? ($validated['start_date'] ?? null) : null,
                'end_date' => $validated['end_date'] ?? null,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'price' => $price,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'تم نشر طلب المباراة الودية بنجاح',
            'match_request' => $matchRequest->load(['stadium', 'hostTeam']),
        ], 201);
    }

    public function sendChallenge(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'target_team_id' => 'required|exists:teams,id',
            'stadium_id' => 'nullable|exists:stadiums,id',
            'custom_terrain_name' => 'nullable|string|max:255',
            'match_datetime' => 'required|date|after:now',
            'notes' => 'nullable|string|max:500',
            'price_per_player' => 'nullable|numeric|min:0',
        ]);

        $teamId = $user->team->id;

        if ($validated['target_team_id'] == $teamId) {
            return response()->json([
                'message' => 'لا يمكنك إرسال تحدي لفريقك',
            ], 403);
        }

        $targetTeam = \App\Models\Team::with('manager')->find($validated['target_team_id']);
        if (!$targetTeam->manager || $targetTeam->manager->status !== 'approved') {
            return response()->json([
                'message' => 'لا يمكن إرسال تحدي لهذا الفريق',
            ], 403);
        }

        $matchRequest = DB::transaction(function () use ($validated, $teamId) {
            return MatchRequest::create([
                'host_team_id' => $teamId,
                'target_team_id' => $validated['target_team_id'],
                'stadium_id' => $validated['stadium_id'] ?? null,
                'custom_terrain_name' => $validated['custom_terrain_name'] ?? null,
                'match_datetime' => $validated['match_datetime'],
                'notes' => $validated['notes'] ?? null,
                'price_per_player' => $validated['price_per_player'] ?? null,
                'type' => 'direct_challenge',
            ]);
        });

        AppNotification::create([
            'user_id' => $targetTeam->manager_id,
            'type' => 'challenge_received',
            'title' => 'تحدي جديد من فريق',
            'body' => "الفريق {$user->team?->name} أرسل لك تحدياً لمباراة ودية بتاريخ {$validated['match_datetime']}",
            'data' => ['match_request_id' => $matchRequest->id],
            'action_url' => '/dashboard',
        ]);

        return response()->json([
            'message' => 'تم إرسال التحدي المباشر للفريق بنجاح',
            'match_request' => $matchRequest->load(['hostTeam', 'targetTeam', 'stadium']),
        ], 201);
    }

    public function respondToChallenge(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $validated = $request->validate([
            'action' => 'required|in:accept,decline',
        ]);

        return DB::transaction(function () use ($id, $teamId, $validated, $user) {
            $matchRequest = MatchRequest::with(['hostTeam.manager', 'stadium.images'])
                ->where('id', $id)
                ->where('target_team_id', $teamId)
                ->where('type', 'direct_challenge')
                ->where('status', 'open')
                ->lockForUpdate()
                ->firstOrFail();

            if ($matchRequest->hostTeam->manager->status !== 'approved') {
                return response()->json([
                    'message' => 'هذا التحدي لم يعد متاحاً',
                ], 403);
            }

            if ($validated['action'] === 'decline') {
                $matchRequest->update(['status' => 'declined']);

                AppNotification::create([
                    'user_id' => $matchRequest->hostTeam->manager_id,
                    'type' => 'challenge_declined',
                    'title' => 'تم رفض التحدي',
                    'body' => "الفريق {$user->team?->name} رفض التحدي الخاص بك",
                    'data' => ['match_request_id' => $matchRequest->id],
                    'action_url' => '/dashboard',
                ]);

                return response()->json([
                    'message' => 'تم رفض التحدي',
                ]);
            }

            $matchRequest->update([
                'opponent_team_id' => $teamId,
                'status' => 'accepted',
            ]);

            AppNotification::create([
                'user_id' => $matchRequest->hostTeam->manager_id,
                'type' => 'challenge_accepted',
                'title' => 'تم قبول التحدي',
                'body' => "الفريق {$user->team?->name} قبل التحدي الخاص بك",
                'data' => ['match_request_id' => $matchRequest->id],
                'action_url' => '/dashboard',
            ]);

            if (!empty($matchRequest->stadium_id)) {
                $terrain = Stadium::find($matchRequest->stadium_id);
                if ($terrain && $terrain->is_open) {
                    $dateTime = Carbon::parse($matchRequest->match_datetime);

                    $conflictMsg = TerrainBooking::getConflictMessage(
                        $matchRequest->stadium_id,
                        $dateTime->toDateString(),
                        $dateTime->format('H:i'),
                        $dateTime->copy()->addHours(2)->format('H:i')
                    );

                    if (!$conflictMsg) {
                        $price = $terrain->price_per_team ?? 0;

                        TerrainBooking::create([
                            'terrain_id' => $matchRequest->stadium_id,
                            'manager_id' => $user->id,
                            'team_id' => $teamId,
                            'booking_type' => 'match',
                            'flow_type' => 'amical',
                            'reservation_type' => 'single',
                            'match_request_id' => $matchRequest->id,
                            'booking_date' => $dateTime->toDateString(),
                            'start_time' => $dateTime->format('H:i'),
                            'end_time' => $dateTime->copy()->addHours(2)->format('H:i'),
                            'price' => $price,
                            'status' => 'pending',
                        ]);
                    }
                }
            }

            $matchRequest->load(['hostTeam.manager', 'stadium']);

            return response()->json([
                'message' => 'تم قبول التحدي بنجاح! يمكنك الآن التواصل مع الفريق المنظم',
                'match_request' => $matchRequest,
                'host_manager' => [
                    'name' => $matchRequest->hostTeam->manager->name,
                    'phone' => $matchRequest->hostTeam->manager->phone,
                    'is_whatsapp' => $matchRequest->hostTeam->manager->is_whatsapp,
                ],
            ]);
        });
    }

    public function createFromBooking(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
            'date' => 'nullable|date',
        ]);

        $booking = TerrainBooking::where('id', $bookingId)
            ->where('manager_id', $user->id)
            ->firstOrFail();

        if ($booking->match_request_id) {
            return response()->json(['message' => 'هذا الحجز مرتبط بالفعل بطلب مباراة'], 422);
        }

        if ($booking->status !== 'approved') {
            return response()->json(['message' => 'يجب أن يكون الحجز مؤكداً أولاً'], 422);
        }

        if ($booking->reservation_type === 'weekly_subscription') {
            $date = !empty($validated['date']) ? Carbon::parse($validated['date']) : $booking->displayDate();

            if (!$date) {
                return response()->json(['message' => 'حدد تاريخ المباراة'], 422);
            }

            $dow = $booking->day_of_week ?? $date->dayOfWeek;

            if ($date->dayOfWeek !== $dow) {
                return response()->json(['message' => 'التاريخ المحدد لا يوافق يوم الحجز الأسبوعي'], 422);
            }

            if ($booking->start_date && $date->lt($booking->start_date)) {
                return response()->json(['message' => 'التاريخ المحدد قبل بداية الحجز الأسبوعي'], 422);
            }

            if ($booking->end_date && $date->gt($booking->end_date)) {
                return response()->json(['message' => 'التاريخ المحدد بعد نهاية الحجز الأسبوعي'], 422);
            }

            $matchDatetime = $date->format('Y-m-d') . ' ' . $booking->start_time;
        } else {
            $date = $booking->booking_date;

            if (!$date) {
                return response()->json(['message' => 'الحجز بدون تاريخ محدد'], 422);
            }

            $matchDatetime = $date->format('Y-m-d') . ' ' . $booking->start_time;
        }

        if (Carbon::parse($matchDatetime)->isPast()) {
            return response()->json(['message' => 'لا يمكن إنشاء مباراة في وقت مضى'], 422);
        }

        $matchRequest = MatchRequest::create([
            'host_team_id' => $user->team->id,
            'stadium_id' => $booking->terrain_id,
            'match_datetime' => $matchDatetime,
            'notes' => $validated['notes'] ?? $booking->notes,
        ]);

        $booking->update([
            'match_request_id' => $matchRequest->id,
            'booking_type' => 'match',
            'flow_type' => 'amical',
        ]);

        return response()->json([
            'message' => 'تم إنشاء طلب المباراة من الحجز بنجاح',
            'match_request' => $matchRequest->load(['stadium', 'hostTeam']),
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $matchRequest = MatchRequest::where('id', $id)
            ->where('host_team_id', $user->team->id)
            ->where('status', 'open')
            ->firstOrFail();

        $matchRequest->update(['status' => 'cancelled']);

        TerrainBooking::where('match_request_id', $matchRequest->id)
            ->where('manager_id', $user->id)
            ->update([
                'match_request_id' => null,
                'flow_type' => 'direct',
            ]);

        return response()->json([
            'message' => 'تم إلغاء طلب المباراة بنجاح',
        ]);
    }
}
