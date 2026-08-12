<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Models\CancellationRequest;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Booking\Services\CalendarSlotService;
use App\Domains\Notification\Models\AppNotification;
use App\Domains\Notification\Services\WhatsAppNotificationService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(
        private WhatsAppNotificationService $whatsapp,
        private CalendarSlotService $calendarSlotService,
    ) {}

    public function getTerrainSlots(Request $request, int $terrainId): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $terrain = Stadium::findOrFail($terrainId);

        if (! $terrain->is_open) {
            return response()->json([
                'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
                'slots' => [],
                'terrain_closed' => true,
                'closure_reason' => $terrain->closure_reason,
                'message' => 'الملعب مغلق حالياً',
            ]);
        }

        $date = Carbon::parse($request->date);
        $dayOfWeek = $date->dayOfWeek;

        $schedule = TerrainSchedule::where('terrain_id', $terrainId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (! $schedule) {
            return response()->json([
                'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
                'slots' => [],
                'message' => 'الملعب غير متاح في هذا اليوم',
            ]);
        }

        $slots = $this->calendarSlotService->generateSlots(
            $schedule->open_time,
            $schedule->close_time,
            $schedule->slot_duration_minutes,
        );

        // Get single bookings for this specific date
        $singleBookings = TerrainBooking::where('terrain_id', $terrainId)
            ->where('booking_date', $request->date)
            ->whereIn('status', ['pending', 'approved'])
            ->get();

        // Get active weekly subscriptions that cover this day_of_week
        $dateStr = $date->toDateString();
        $weeklySubscriptions = TerrainBooking::where('terrain_id', $terrainId)
            ->where('reservation_type', 'weekly_subscription')
            ->where('day_of_week', $dayOfWeek)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($dateStr) {
                $q->where(function ($sq) use ($dateStr) {
                    $sq->whereNull('start_date')->orWhere('start_date', '<=', $dateStr);
                });
                $q->where(function ($sq) use ($dateStr) {
                    $sq->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
                });
            })
            ->get();

        $allBookings = $singleBookings->merge($weeklySubscriptions);

        $slotResults = collect($slots)->map(function ($slot) use ($allBookings) {
            $booking = $allBookings->first(function ($b) use ($slot) {
                return $b->start_time <= $slot['start'] && $b->end_time > $slot['start']
                    || $b->start_time < $slot['end'] && $b->end_time >= $slot['end']
                    || $b->start_time >= $slot['start'] && $b->end_time <= $slot['end'];
            });

            return [
                'start' => $slot['start'],
                'end' => $slot['end'],
                'status' => $booking ? 'booked' : 'available',
                'booking' => $booking ? [
                    'id' => $booking->id,
                    'booking_type' => $booking->booking_type,
                    'reservation_type' => $booking->reservation_type,
                    'status' => $booking->status,
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'manager' => $booking->manager?->only(['id', 'name']),
                    'team' => $booking->team?->only(['id', 'name']),
                ] : null,
            ];
        });

        return response()->json([
            'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
            'schedule' => [
                'open_time' => $schedule->open_time,
                'close_time' => $schedule->close_time,
                'slot_duration' => $schedule->slot_duration_minutes,
            ],
            'date' => $request->date,
            'slots' => $slotResults,
        ]);
    }

    public function createTrainingBooking(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'terrain_id' => 'required|exists:stadiums,id',
            'reservation_type' => 'required|in:single,weekly_subscription',
            'booking_date' => 'required_if:reservation_type,single|date|after_or_equal:today',
            'day_of_week' => 'required_if:reservation_type,weekly_subscription|nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'required_if:reservation_type,weekly_subscription|nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'booking_type' => 'required|in:training,private',
            'notes' => 'nullable|string|max:500',
        ]);

        $terrain = Stadium::findOrFail($validated['terrain_id']);

        if (! $terrain->is_available) {
            return response()->json(['message' => 'الملعب غير متاح حالياً'], 422);
        }

        if (! $terrain->is_open) {
            return response()->json(['message' => 'الملعب مغلق حالياً — لا يمكن الحجز'], 422);
        }

        $team = $user->team;
        if (! $team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $isWeekly = $validated['reservation_type'] === 'weekly_subscription';

        if ($isWeekly) {
            $checkDate = $validated['start_date'];
        } else {
            $checkDate = $validated['booking_date'];
        }

        $conflictMsg = null;
        $weekPrice = $terrain->price_per_team ?? 0;

        $booking = null;

        DB::transaction(function () use ($validated, $terrain, $isWeekly, &$conflictMsg, &$weekPrice, &$booking, $user, $team) {
            $dateToLock = $isWeekly ? $validated['start_date'] : $validated['booking_date'];
            TerrainBooking::where('terrain_id', $validated['terrain_id'])
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
                $validated['terrain_id'],
                $dateToLock,
                $validated['start_time'],
                $validated['end_time']
            );

            if ($conflictMsg) {
                return;
            }

            $price = $terrain->price_per_team ?? 0;

            if ($isWeekly) {
                $weeks = 4;
                if ($validated['end_date']) {
                    $weeks = (int) ceil(Carbon::parse($validated['start_date'])->diffInWeeks(Carbon::parse($validated['end_date'])) ?: 4);
                }
                $weekPrice = $price * $weeks;
            } else {
                $weekPrice = $price;
            }

            $booking = TerrainBooking::create([
                'terrain_id' => $validated['terrain_id'],
                'manager_id' => $user->id,
                'team_id' => $team->id,
                'booking_type' => $validated['booking_type'],
                'flow_type' => 'direct',
                'reservation_type' => $validated['reservation_type'],
                'booking_date' => $isWeekly ? $validated['start_date'] : $validated['booking_date'],
                'day_of_week' => $isWeekly ? $validated['day_of_week'] : null,
                'start_date' => $isWeekly ? $validated['start_date'] : null,
                'end_date' => $validated['end_date'] ?? null,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'price' => $weekPrice,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        if ($conflictMsg) {
            return response()->json(['message' => $conflictMsg], 422);
        }

        if (! $booking) {
            return response()->json(['message' => 'تعذر إنشاء الحجز'], 500);
        }

        $booking->load(['terrain.owner', 'team', 'manager']);

        return response()->json([
            'message' => $isWeekly
                ? 'تم إرسال طلب الأبونمان الأسبوعي بنجاح. بانتظار تأكيد صاحب الملعب'
                : 'تم إرسال طلب الحجز بنجاح. بانتظار تأكيد صاحب الملعب',
            'booking' => $booking,
            'whatsapp_notification_url' => $this->whatsapp->buildBookingRequestMessage($booking),
        ], 201);
    }

    public function getOwnerCalendar(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();

        $terrain = Stadium::where('id', $terrainId)
            ->where('owner_id', $user->id)
            ->firstOrFail();

        $request->validate([
            'date' => 'sometimes|date',
            'week_start' => 'sometimes|date',
            'weeks' => 'sometimes|integer|min:1|max:12',
        ]);

        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();

        $startOfWeek = $request->week_start
            ? Carbon::parse($request->week_start)->startOfWeek()
            : $date->copy()->startOfWeek();

        $endOfWeek = $startOfWeek->copy()->endOfWeek();

        $weeks = min((int) $request->input('weeks', 1), 12);
        $rangeEnd = $startOfWeek->copy()->addDays(7 * $weeks - 1);

        $schedules = TerrainSchedule::where('terrain_id', $terrainId)
            ->where('is_active', true)
            ->get()
            ->keyBy('day_of_week');

        // Get single bookings for the week
        $singleBookings = TerrainBooking::where('terrain_id', $terrainId)
            ->where('reservation_type', 'single')
            ->whereIn('status', ['pending', 'approved'])
            ->whereBetween('booking_date', [$startOfWeek->toDateString(), $rangeEnd->toDateString()])
            ->with(['manager.playerProfile', 'team', 'matchRequest'])
            ->get();

        // Get active weekly subscriptions covering any day in this week range
        $weekDays = [];
        for ($d = $startOfWeek->copy(); $d->lte($endOfWeek); $d->addDay()) {
            $weekDays[] = $d->dayOfWeek;
        }
        $weekDays = array_unique($weekDays);

        $weeklySubscriptions = TerrainBooking::where('terrain_id', $terrainId)
            ->where('reservation_type', 'weekly_subscription')
            ->whereIn('day_of_week', $weekDays)
            ->whereIn('status', ['pending', 'approved'])
            ->with(['manager.playerProfile', 'team'])
            ->get()
            ->filter(function ($sub) use ($startOfWeek, $rangeEnd) {
                if ($sub->start_date && $sub->start_date->gt($rangeEnd)) {
                    return false;
                }
                if ($sub->end_date && $sub->end_date->lt($startOfWeek)) {
                    return false;
                }

                return true;
            });

        $pendingBookings = TerrainBooking::where('terrain_id', $terrainId)
            ->where('status', 'pending')
            ->with(['manager.playerProfile', 'team', 'terrain.owner'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (TerrainBooking $booking) {
                return [
                    'id' => $booking->id,
                    'booking_date' => $booking->booking_date?->toDateString(),
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'price' => (float) $booking->price,
                    'status' => $booking->status,
                    'booking_type' => $booking->booking_type,
                    'flow_type' => $booking->flow_type ?? 'direct',
                    'reservation_type' => $booking->reservation_type ?? 'single',
                    'notes' => $booking->notes,
                    'created_at' => $booking->created_at,
                    'manager' => $this->managerSummary($booking->manager),
                    'team' => $booking->team?->only(['id', 'name']),
                    'terrain' => $booking->terrain?->only(['id', 'name']),
                    'whatsapp_notification_url' => $this->whatsapp->buildBookingRequestMessage($booking),
                ];
            });

        // Compute stats
        $totalBookings = TerrainBooking::where('terrain_id', $terrainId)
            ->whereIn('status', ['pending', 'approved'])
            ->count();
        $activeSubscriptions = TerrainBooking::where('terrain_id', $terrainId)
            ->where('reservation_type', 'weekly_subscription')
            ->where('status', 'approved')
            ->count();
        $emptySlots = 0;

        $closures = TerrainSlotClosure::where('terrain_id', $terrainId)
            ->whereBetween('closure_date', [$startOfWeek->toDateString(), $rangeEnd->toDateString()])
            ->get();

        $days = [];
        for ($d = $startOfWeek->copy(); $d->lte($rangeEnd); $d->addDay()) {
            $daySingleBookings = $singleBookings->filter(fn($b) => $b->booking_date?->isSameDay($d));
            $schedule = $schedules->get($d->dayOfWeek);

            $slots = [];
            if ($schedule) {
                $generatedSlots = $this->calendarSlotService->generateSlots(
                    $schedule->open_time,
                    $schedule->close_time,
                    $schedule->slot_duration_minutes,
                );

                foreach ($generatedSlots as $slot) {
                    // Check single booking
                    $booking = $daySingleBookings->first(function ($b) use ($slot) {
                        return $b->start_time <= $slot['start'] && $b->end_time > $slot['start']
                            || $b->start_time < $slot['end'] && $b->end_time >= $slot['end']
                            || $b->start_time >= $slot['start'] && $b->end_time <= $slot['end'];
                    });

                    $slotStatus = $booking ? 'booked' : 'available';
                    $slotBooking = $booking;

                    // Check weekly subscription if no single booking
                    if (! $booking) {
                        $subscription = $weeklySubscriptions->first(function ($sub) use ($d, $slot) {
                            return $sub->day_of_week === $d->dayOfWeek
                                && $sub->coversDate($d)
                                && ($sub->start_time <= $slot['start'] && $sub->end_time > $slot['start']
                                    || $sub->start_time < $slot['end'] && $sub->end_time >= $slot['end']
                                    || $sub->start_time >= $slot['start'] && $sub->end_time <= $slot['end']);
                        });

                        if ($subscription) {
                            $slotStatus = 'booked';
                            $slotBooking = $subscription;
                        }
                    }

                    $slotClosure = null;
                    if ($slotStatus === 'available') {
                        $slotClosure = $closures->first(function ($c) use ($d, $slot) {
                            return $c->closure_date->isSameDay($d)
                                && $c->start_time <= $slot['start'] && $c->end_time > $slot['start'];
                        });

                        if ($slotClosure) {
                            $slotStatus = 'closed';
                        }
                    }

                    if ($slotStatus === 'available') {
                        $emptySlots++;
                    }

                    $slots[] = [
                        'start' => $slot['start'],
                        'end' => $slot['end'],
                        'status' => $slotStatus,
                        'booking' => $slotBooking ? [
                            'id' => $slotBooking->id,
                            'booking_type' => $slotBooking->booking_type,
                            'flow_type' => $slotBooking->flow_type ?? 'direct',
                            'reservation_type' => $slotBooking->reservation_type ?? 'single',
                            'status' => $slotBooking->status,
                            'price' => $slotBooking->price,
                            'start_time' => $slotBooking->start_time,
                            'end_time' => $slotBooking->end_time,
                            'manager' => $this->managerSummary($slotBooking->manager),
                            'team' => $slotBooking->team?->only(['id', 'name']),
                        ] : null,
                        'closure' => $slotClosure ? [
                            'id' => $slotClosure->id,
                            'reason' => $slotClosure->reason,
                        ] : null,
                    ];
                }
            }

            $days[] = [
                'date' => $d->toDateString(),
                'day_name' => $d->translatedFormat('l'),
                'is_open' => $schedule !== null,
                'slots' => $slots,
            ];
        }

        return response()->json([
            'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
            'week' => [
                'start' => $startOfWeek->toDateString(),
                'end' => $rangeEnd->toDateString(),
            ],
            'stats' => [
                'total_bookings' => $totalBookings,
                'active_subscriptions' => $activeSubscriptions,
                'empty_slots' => $emptySlots,
            ],
            'days' => $days,
            'pending_bookings' => $pendingBookings,
        ]);
    }

    public function ownerManageBooking(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        $booking = TerrainBooking::whereHas('terrain', function ($q) use ($user) {
            $q->where('owner_id', $user->id);
        })->where('id', $bookingId)->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected,completed,cancelled',
        ]);

        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'هذا الحجز ليس في حالة انتظار'], 422);
        }

        if ($validated['status'] === 'approved') {
            $conflictMsg = null;
            $statusToSet = $validated['status'];
            DB::transaction(function () use ($booking, &$conflictMsg, $statusToSet) {
                $dateToLock = $booking->isWeeklySubscription() ? ($booking->start_date?->toDateString() ?? now()->toDateString()) : ($booking->booking_date?->toDateString() ?? now()->toDateString());

                TerrainBooking::where('terrain_id', $booking->terrain_id)
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
                    $booking->terrain_id,
                    $dateToLock,
                    $booking->start_time,
                    $booking->end_time,
                    $booking->id
                );

                if ($conflictMsg) {
                    return;
                }

                $booking->update(['status' => $statusToSet]);
            });

            if ($conflictMsg) {
                return response()->json(['message' => $conflictMsg], 422);
            }
        } else {
            $statusToSet = $validated['status'];
            DB::transaction(function () use ($booking, $statusToSet) {
                $bookingLock = TerrainBooking::where('id', $booking->id)->lockForUpdate()->first();
                if ($bookingLock->status !== 'pending') {
                    return;
                }
                $bookingLock->update(['status' => $statusToSet]);
            });
            $booking->refresh();
        }

        $booking->load(['manager', 'team', 'terrain']);

        $response = [
            'message' => match ($validated['status']) {
                'approved' => 'تم تأكيد الحجز بنجاح',
                'rejected' => 'تم رفض الحجز',
                'completed' => 'تم تحديد المباراة كمكتملة',
                'cancelled' => 'تم إلغاء الحجز',
            },
            'booking' => $booking,
        ];

        if (in_array($validated['status'], ['approved', 'rejected'])) {
            $response['whatsapp_notification_url'] = $this->whatsapp
                ->buildOwnerDecisionMessage($booking, $validated['status']);
        }

        return response()->json($response);
    }

    public function ownerCreateGuestBooking(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();

        $terrain = Stadium::where('id', $terrainId)
            ->where('owner_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'reservation_type' => 'required|in:single,weekly_subscription',
            'booking_date' => 'required_if:reservation_type,single|date|after_or_equal:today',
            'day_of_week' => 'required_if:reservation_type,weekly_subscription|nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'required_if:reservation_type,weekly_subscription|nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'booking_type' => 'required|in:training,private,match',
            'guest_name' => 'required|string|max:255',
            'guest_phone' => 'required|string|max:50',
            'guest_email' => 'nullable|email|max:255',
            'notes' => 'nullable|string|max:500',
        ]);

        if (! $terrain->is_available) {
            return response()->json(['message' => 'الملعب غير متاح حالياً'], 422);
        }

        if (! $terrain->is_open) {
            return response()->json(['message' => 'الملعب مغلق حالياً — لا يمكن الحجز'], 422);
        }

        $isWeekly = $validated['reservation_type'] === 'weekly_subscription';

        $checkDate = $isWeekly ? $validated['start_date'] : $validated['booking_date'];

        // Create guest booking inside a transaction with locking to avoid races
        $guestBooking = null;
        DB::transaction(function () use ($terrainId, $validated, $isWeekly, &$guestBooking) {
            $dateToLock = $isWeekly ? $validated['start_date'] : $validated['booking_date'];
            TerrainBooking::where('terrain_id', $terrainId)
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
                $terrainId,
                $dateToLock,
                $validated['start_time'],
                $validated['end_time']
            );

            if ($conflictMsg) {
                return;
            }

            $price = $terrain->price_per_team ?? 0;
            if ($isWeekly) {
                $weeks = 4;
                if ($validated['end_date']) {
                    $weeks = (int) ceil(Carbon::parse($validated['start_date'])->diffInWeeks(Carbon::parse($validated['end_date'])) ?: 4);
                }
                $price = $price * $weeks;
            }

            $guestBooking = TerrainBooking::create([
                'terrain_id' => $terrainId,
                'manager_id' => null,
                'team_id' => null,
                'booking_type' => $validated['booking_type'],
                'flow_type' => 'direct',
                'reservation_type' => $validated['reservation_type'],
                'booking_date' => $isWeekly ? $validated['start_date'] : $validated['booking_date'],
                'day_of_week' => $isWeekly ? $validated['day_of_week'] : null,
                'start_date' => $isWeekly ? $validated['start_date'] : null,
                'end_date' => $validated['end_date'] ?? null,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'price' => $price,
                'status' => 'approved',
                'notes' => $validated['notes'] ?? null,
                'guest_name' => $validated['guest_name'],
                'guest_phone' => $validated['guest_phone'],
                'guest_email' => $validated['guest_email'] ?? null,
            ]);
        });

        if (! empty($conflictMsg)) {
            return response()->json(['message' => $conflictMsg], 422);
        }

        if (! $guestBooking) {
            return response()->json(['message' => 'تعذر إنشاء الحجز الضيف'], 500);
        }

        $booking = $booking ?? $guestBooking;
        $booking->load(['terrain.owner']);

        return response()->json([
            'message' => 'تم إنشاء الحجز الضيف بنجاح',
            'booking' => $booking,
            'whatsapp_notification_url' => $this->whatsapp->buildOwnerDecisionMessage($booking, 'approved'),
        ], 201);
    }

    public function getManagerBookings(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        $perPage = (int) $request->input('per_page', 30);

        $bookings = TerrainBooking::with(['terrain:id,name,city,type', 'team:id,name'])
            ->where('manager_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('match_request_id')
            ->where(function ($q) use ($today) {
                $q->where('reservation_type', 'single')
                    ->whereDate('booking_date', '>=', $today)
                    ->orWhere(function ($sq) use ($today) {
                        $sq->where('reservation_type', 'weekly_subscription')
                            ->where(function ($ssq) use ($today) {
                                $ssq->whereNull('end_date')
                                    ->orWhereDate('end_date', '>=', $today);
                            });
                    });
            })
            ->orderBy('booking_date')
            ->orderBy('start_time')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($b) {
            $b->next_date = $b->displayDate()?->toDateString();

            return $b;
        });

        return response()->json([
            'bookings' => $bookings->items(),
            'pagination' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
            ],
        ]);
    }

    public function myReservations(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today();

        $bookings = TerrainBooking::where('terrain_id', $terrainId)
            ->where('manager_id', $user->id)
            ->whereNull('match_request_id')
            ->whereIn('status', ['approved'])
            ->get();

        $reservations = [];

        foreach ($bookings as $booking) {
            if ($booking->reservation_type === 'weekly_subscription') {
                $start = $booking->start_date ? $booking->start_date->copy() : $today->copy()->startOfWeek();
                $end = $booking->end_date ? $booking->end_date->copy() : $start->copy()->addMonths(6);
                $dow = $booking->day_of_week ?? $start->dayOfWeek;

                $cursor = $start->lt($today) ? $today->copy() : $start->copy();
                $daysAhead = ($dow - $cursor->dayOfWeek + 7) % 7;
                $cursor = $cursor->addDays($daysAhead);

                $count = 0;
                while ($cursor->lte($end) && $count < 8) {
                    $reservations[] = [
                        'id' => $booking->id,
                        'booking_type' => $booking->booking_type,
                        'reservation_type' => 'weekly_subscription',
                        'date' => $cursor->toDateString(),
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                        'price' => $booking->price,
                        'day_of_week' => $dow,
                        'status' => $booking->status,
                    ];
                    $cursor = $cursor->addWeek();
                    $count++;
                }
            } else {
                $date = $booking->booking_date;
                if (! $date || $date->isPast()) {
                    continue;
                }
                $reservations[] = [
                    'id' => $booking->id,
                    'booking_type' => $booking->booking_type,
                    'reservation_type' => 'single',
                    'date' => $date->toDateString(),
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'price' => $booking->price,
                    'day_of_week' => $date->dayOfWeek,
                    'status' => $booking->status,
                ];
            }
        }

        usort($reservations, function ($a, $b) {
            return [$a['date'], $a['start_time']] <=> [$b['date'], $b['start_time']];
        });

        return response()->json(['reservations' => $reservations]);
    }

    public function requestCancel(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        $booking = TerrainBooking::where('id', $bookingId)
            ->where('manager_id', $user->id)
            ->whereIn('status', ['approved'])
            ->firstOrFail();

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $existing = CancellationRequest::where('terrain_booking_id', $bookingId)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'طلب إلغاء موجود بالفعل'], 422);
        }

        $cancellation = CancellationRequest::create([
            'terrain_booking_id' => $bookingId,
            'user_id' => $user->id,
            'reason' => $validated['reason'] ?? null,
            'status' => 'pending',
        ]);

        $booking->load('terrain.owner');
        if ($booking->terrain?->owner_id) {
            AppNotification::create([
                'user_id' => $booking->terrain->owner_id,
                'type' => 'cancellation_requested',
                'title' => 'طلب إلغاء حجز',
                'body' => "المسير {$user->name} يطلب إلغاء حجز ملعب {$booking->terrain->name} في تاريخ {$booking->booking_date?->format('Y-m-d')}",
                'data' => ['booking_id' => $booking->id, 'cancellation_id' => $cancellation->id],
                'action_url' => '/terrain/calendar',
            ]);
        }

        return response()->json([
            'message' => 'تم إرسال طلب الإلغاء إلى صاحب الملعب',
            'cancellation' => $cancellation,
        ], 201);
    }

    private function managerSummary(?User $manager): ?array
    {
        if (! $manager) {
            return null;
        }

        return [
            'id' => $manager->id,
            'name' => $manager->name,
            'phone' => $manager->phone,
            'email' => $manager->email,
            'profile_image' => $manager->playerProfile?->photo_url,
        ];
    }
}
