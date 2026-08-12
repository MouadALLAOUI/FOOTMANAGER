<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Match\Queries\MatchRequestQuery;
use App\Domains\Notification\Models\AppNotification;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MatchRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $status = $request->query('status');
        $perPage = (int) $request->input('per_page', 50);

        $requests = MatchRequestQuery::forTeam($teamId, $status)->paginate($perPage);

        return response()->json([
            'match_requests' => $requests->items(),
            'pagination' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    public function receivedChallenges(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;
        $perPage = (int) $request->input('per_page', 50);

        $challenges = MatchRequestQuery::receivedChallenges($teamId)->paginate($perPage);

        return response()->json([
            'challenges' => $challenges->items(),
            'pagination' => [
                'current_page' => $challenges->currentPage(),
                'last_page' => $challenges->lastPage(),
                'per_page' => $challenges->perPage(),
                'total' => $challenges->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'stadium_id' => 'nullable|exists:stadiums,id',
            'custom_terrain_name' => 'nullable|string|max:255',
            'match_datetime' => 'required|date|after:now',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'reservation_type' => 'sometimes|in:single,weekly_subscription',
            'day_of_week' => 'nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:500',
            'price_per_player' => 'nullable|numeric|min:0',
            'needs_players' => 'sometimes|boolean',
            'players_needed' => 'nullable|integer|min:1|max:50|required_if:needs_players,true',
        ]);

        $needsPlayers = (bool) ($validated['needs_players'] ?? false);

        $teamId = $user->team->id;
        $datetime = Carbon::parse($validated['match_datetime']);

        if (MatchMembershipService::teamHasMatchConflict($teamId, $datetime)) {
            return response()->json(['message' => 'فريقك لديه مباراة أخرى في نفس التوقيت'], 422);
        }

        if (MatchMembershipService::teamHasPlayerConflict($teamId, $datetime)) {
            return response()->json(['message' => 'أحد لاعبي فريقك مشغول بمباراة أخرى في نفس التوقيت'], 422);
        }

        if (empty($validated['stadium_id']) && empty($validated['custom_terrain_name'])) {
            return response()->json([
                'message' => 'يجب اختيار ملعب أو كتابة اسم ملعب',
            ], 422);
        }

        $endTime = $validated['end_time']
            ?? Carbon::parse($validated['start_time'])->addHours(2)->format('H:i');

        $matchRequest = null;

        if (empty($validated['stadium_id'])) {
            $matchRequest = MatchRequest::create([
                'host_team_id' => $user->team->id,
                'stadium_id' => null,
                'custom_terrain_name' => $validated['custom_terrain_name'] ?? null,
                'match_datetime' => $validated['match_datetime'],
                'notes' => $validated['notes'] ?? null,
                'price_per_player' => $validated['price_per_player'] ?? null,
                'needs_players' => $needsPlayers,
                'players_needed' => $needsPlayers ? ($validated['players_needed'] ?? null) : null,
            ]);
        } else {
            $terrain = Stadium::find($validated['stadium_id']);

            if (! $terrain->is_available || ! $terrain->is_open) {
                return response()->json([
                    'message' => 'الملعب غير متاح حالياً — لا يمكن إرسال طلب المباراة',
                ], 422);
            }

            $isWeekly = ($validated['reservation_type'] ?? 'single') === 'weekly_subscription';
            $checkDate = $isWeekly
                ? ($validated['start_date'] ?? $validated['match_datetime'])
                : ($validated['start_date'] ?? date('Y-m-d', strtotime($validated['match_datetime'])));

            try {
                DB::transaction(function () use ($validated, $terrain, $user, $checkDate, $endTime, $isWeekly, &$matchRequest) {
                    $matchRequest = MatchRequest::create([
                        'host_team_id' => $user->team->id,
                        'stadium_id' => $validated['stadium_id'],
                        'custom_terrain_name' => $validated['custom_terrain_name'] ?? null,
                        'match_datetime' => $validated['match_datetime'],
                        'notes' => $validated['notes'] ?? null,
                        'price_per_player' => $validated['price_per_player'] ?? null,
                        'needs_players' => (bool) ($validated['needs_players'] ?? false),
                        'players_needed' => ($validated['needs_players'] ?? false) ? ($validated['players_needed'] ?? null) : null,
                    ]);

                    $dateToLock = $checkDate;
                    TerrainBooking::where('terrain_id', $validated['stadium_id'])
                        ->where(function ($q) use ($dateToLock) {
                            $q->where('booking_date', $dateToLock)
                                ->orWhere(function ($sq) use ($dateToLock) {
                                    $sq->where('reservation_type', 'weekly_subscription')
                                        ->where(function ($wq) use ($dateToLock) {
                                            $wq->whereNull('start_date')->orWhere('start_date', '<=', $dateToLock);
                                        })
                                        ->where(function ($wq) use ($dateToLock) {
                                            $wq->whereNull('end_date')->orWhere('end_date', '>=', $dateToLock);
                                        });
                                });
                        })->lockForUpdate()->get();

                    $conflictMsg = TerrainBooking::getConflictMessage(
                        $validated['stadium_id'],
                        $checkDate,
                        $validated['start_time'],
                        $endTime,
                        $user->id
                    );

                    if (! $conflictMsg && MatchMembershipService::stadiumHasFixtureConflict(
                        $validated['stadium_id'],
                        Carbon::parse($checkDate.' '.$validated['start_time'])
                    )) {
                        $conflictMsg = 'هذا الملعب محجوز مسبقاً لمباراة في البطولة في التوقيت المحدد.';
                    }

                    if ($conflictMsg) {
                        throw new \RuntimeException($conflictMsg);
                    }

                    $price = $terrain->price_per_team ?? 0;

                    if ($isWeekly && ! empty($validated['end_date'])) {
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
                        'end_time' => $endTime,
                        'price' => $price,
                        'status' => 'pending',
                        'notes' => $validated['notes'] ?? null,
                    ]);
                });
            } catch (\RuntimeException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }
        }

        if (! $matchRequest) {
            return response()->json(['message' => 'حدث خطأ أثناء إنشاء طلب المباراة'], 500);
        }

        return response()->json([
            'message' => 'تم نشر طلب المباراة الودية بنجاح',
            'match_request' => $matchRequest->load(['stadium', 'hostTeam']),
        ], 201);
    }

    public function sendChallenge(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'target_team_id' => 'required|exists:teams,id',
            'stadium_id' => 'nullable|exists:stadiums,id',
            'custom_terrain_name' => 'nullable|string|max:255',
            'match_datetime' => 'required|date|after:now',
            'notes' => 'nullable|string|max:500',
            'price_per_player' => 'nullable|numeric|min:0',
            'needs_players' => 'sometimes|boolean',
            'players_needed' => 'nullable|integer|min:1|max:50|required_if:needs_players,true',
        ]);

        $teamId = $user->team->id;
        $needsPlayers = (bool) ($validated['needs_players'] ?? false);

        $datetime = Carbon::parse($validated['match_datetime']);

        if (MatchMembershipService::teamHasMatchConflict($teamId, $datetime)) {
            return response()->json(['message' => 'فريقك لديه مباراة أخرى في نفس التوقيت'], 422);
        }

        if (MatchMembershipService::teamHasPlayerConflict($teamId, $datetime)) {
            return response()->json(['message' => 'أحد لاعبي فريقك مشغول بمباراة أخرى في نفس التوقيت'], 422);
        }

        if ($validated['target_team_id'] == $teamId) {
            return response()->json([
                'message' => 'لا يمكنك إرسال تحدي لفريقك',
            ], 403);
        }

        $targetTeam = Team::with('manager')->find($validated['target_team_id']);
        if (! $targetTeam->manager || $targetTeam->manager->status !== 'approved') {
            return response()->json([
                'message' => 'لا يمكن إرسال تحدي لهذا الفريق',
            ], 403);
        }

        $matchRequest = DB::transaction(function () use ($validated, $teamId, $needsPlayers) {
            return MatchRequest::create([
                'host_team_id' => $teamId,
                'target_team_id' => $validated['target_team_id'],
                'stadium_id' => $validated['stadium_id'] ?? null,
                'custom_terrain_name' => $validated['custom_terrain_name'] ?? null,
                'match_datetime' => $validated['match_datetime'],
                'notes' => $validated['notes'] ?? null,
                'price_per_player' => $validated['price_per_player'] ?? null,
                'needs_players' => $needsPlayers,
                'players_needed' => $needsPlayers ? ($validated['players_needed'] ?? null) : null,
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

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $validated = $request->validate([
            'action' => 'required|in:accept,decline',
            'needs_players' => 'sometimes|boolean',
            'players_needed' => 'nullable|integer|min:1|max:50|required_if:needs_players,true',
        ]);

        $needsPlayers = (bool) ($validated['needs_players'] ?? false);

        try {
            return DB::transaction(function () use ($id, $teamId, $validated, $user, $needsPlayers) {
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

                $datetime = Carbon::parse($matchRequest->match_datetime);

                if (MatchMembershipService::teamHasMatchConflict($matchRequest->host_team_id, $datetime, $matchRequest->id)
                    || MatchMembershipService::teamHasMatchConflict($teamId, $datetime, $matchRequest->id)) {
                    throw new \RuntimeException('أحد الفريقين لديه مباراة أخرى في نفس التوقيت');
                }

                if (MatchMembershipService::teamHasPlayerConflict($matchRequest->host_team_id, $datetime, $matchRequest->id)
                    || MatchMembershipService::teamHasPlayerConflict($teamId, $datetime, $matchRequest->id)) {
                    throw new \RuntimeException('أحد لاعبي الفريقين مشغول بمباراة أخرى في نفس التوقيت');
                }

                if (! empty($matchRequest->stadium_id)) {
                    $terrain = Stadium::find($matchRequest->stadium_id);
                    if (! $terrain || ! $terrain->is_open) {
                        throw new \RuntimeException('الملعب غير متاح حالياً — لا يمكن قبول التحدي');
                    }

                    $dateTime = Carbon::parse($matchRequest->match_datetime);
                    $dateToLock = $dateTime->toDateString();
                    TerrainBooking::where('terrain_id', $matchRequest->stadium_id)
                        ->where(function ($q) use ($dateToLock) {
                            $q->where('booking_date', $dateToLock)
                                ->orWhere(function ($sq) use ($dateToLock) {
                                    $sq->where('reservation_type', 'weekly_subscription')
                                        ->where(function ($wq) use ($dateToLock) {
                                            $wq->whereNull('start_date')->orWhere('start_date', '<=', $dateToLock);
                                        })
                                        ->where(function ($wq) use ($dateToLock) {
                                            $wq->whereNull('end_date')->orWhere('end_date', '>=', $dateToLock);
                                        });
                                });
                        })->lockForUpdate()->get();

                    $conflictMsg = TerrainBooking::getConflictMessage(
                        $matchRequest->stadium_id,
                        $dateTime->toDateString(),
                        $dateTime->format('H:i'),
                        $dateTime->copy()->addHours(2)->format('H:i')
                    );

                    if (! $conflictMsg && MatchMembershipService::stadiumHasFixtureConflict($matchRequest->stadium_id, $dateTime)) {
                        $conflictMsg = 'هذا الملعب محجوز مسبقاً لمباراة في البطولة في التوقيت المحدد.';
                    }

                    if ($conflictMsg) {
                        throw new \RuntimeException($conflictMsg);
                    }

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

                $matchRequest->update([
                    'opponent_team_id' => $teamId,
                    'status' => 'accepted',
                    'needs_players' => $needsPlayers,
                    'players_needed' => $needsPlayers ? ($validated['players_needed'] ?? null) : null,
                ]);

                AppNotification::create([
                    'user_id' => $matchRequest->hostTeam->manager_id,
                    'type' => 'challenge_accepted',
                    'title' => 'تم قبول التحدي',
                    'body' => "الفريق {$user->team?->name} قبل التحدي الخاص بك",
                    'data' => ['match_request_id' => $matchRequest->id],
                    'action_url' => '/dashboard',
                ]);

                if (! empty($matchRequest->stadium_id)) {
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
                }

                return response()->json([
                    'message' => 'تم قبول التحدي بنجاح',
                    'match_request' => $matchRequest->fresh()->load(['hostTeam.manager', 'stadium']),
                ]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function createFromBooking(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
            'date' => 'nullable|date',
            'needs_players' => 'sometimes|boolean',
            'players_needed' => 'nullable|integer|min:1|max:50|required_if:needs_players,true',
        ]);

        $needsPlayers = (bool) ($validated['needs_players'] ?? false);

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
            $date = ! empty($validated['date']) ? Carbon::parse($validated['date']) : $booking->displayDate();

            if (! $date) {
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

            if (! $date) {
                return response()->json(['message' => 'الحجز بدون تاريخ محدد'], 422);
            }

            $matchDatetime = $date->format('Y-m-d') . ' ' . $booking->start_time;
        }

        if (Carbon::parse($matchDatetime)->isPast()) {
            return response()->json(['message' => 'لا يمكن إنشاء مباراة في وقت مضى'], 422);
        }

        $datetime = Carbon::parse($matchDatetime);

        if (MatchMembershipService::teamHasMatchConflict($user->team->id, $datetime)) {
            return response()->json(['message' => 'فريقك لديه مباراة أخرى في نفس التوقيت'], 422);
        }

        if (MatchMembershipService::teamHasPlayerConflict($user->team->id, $datetime)) {
            return response()->json(['message' => 'أحد لاعبي فريقك مشغول بمباراة أخرى في نفس التوقيت'], 422);
        }

        if (MatchMembershipService::stadiumHasFixtureConflict($booking->terrain_id, $datetime)) {
            return response()->json(['message' => 'هذا الملعب محجوز مسبقاً لمباراة في البطولة في التوقيت المحدد.'], 422);
        }

        $matchRequest = null;

        DB::transaction(function () use ($user, $booking, $matchDatetime, $validated, $needsPlayers, &$matchRequest) {
            $bookingLock = TerrainBooking::where('id', $booking->id)->lockForUpdate()->first();

            // Re-check booking status
            if ($bookingLock->status !== 'approved') {
                throw new \RuntimeException('Booking must be approved to create match request from it');
            }

            $matchRequest = MatchRequest::create([
                'host_team_id' => $user->team->id,
                'stadium_id' => $booking->terrain_id,
                'match_datetime' => $matchDatetime,
                'notes' => $validated['notes'] ?? $booking->notes,
                'needs_players' => $needsPlayers,
                'players_needed' => $needsPlayers ? ($validated['players_needed'] ?? null) : null,
            ]);

            $bookingLock->update([
                'match_request_id' => $matchRequest->id,
                'booking_type' => 'match',
                'flow_type' => 'amical',
            ]);
        });

        if (! $matchRequest) {
            return response()->json(['message' => 'حدث خطأ أثناء إنشاء طلب المباراة من الحجز'], 500);
        }

        return response()->json([
            'message' => 'تم إنشاء طلب المباراة من الحجز بنجاح',
            'match_request' => $matchRequest->load(['stadium', 'hostTeam']),
        ], 201);
    }

    public function start(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $matchRequest = MatchRequest::where('id', $id)
            ->whereIn('status', ['open', 'accepted'])
            ->firstOrFail();

        if ($matchRequest->host_team_id !== $teamId && $matchRequest->opponent_team_id !== $teamId) {
            return response()->json(['message' => 'غير مصرح لك ببدء هذه المباراة'], 403);
        }

        $matchRequest->update([
            'status' => 'live',
            'started_at' => now(),
        ]);

        return response()->json([
            'message' => 'تم بدء المباراة بنجاح',
            'match_request' => $matchRequest->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
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