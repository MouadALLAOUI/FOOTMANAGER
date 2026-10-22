<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Events\BookingApproved;
use App\Domains\Booking\Events\BookingCancelled;
use App\Domains\Booking\Events\BookingCompleted;
use App\Domains\Booking\Events\BookingCreated;
use App\Domains\Booking\Events\BookingRejected;
use App\Domains\Booking\Models\CancellationRequest;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Booking\Services\CalendarSlotService;
use App\Domains\Booking\Services\SlotAvailabilityService;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Notification\Services\WhatsAppNotificationService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    public function __construct(
        private WhatsAppNotificationService $whatsapp,
        private CalendarSlotService $calendarSlotService,
        private SlotAvailabilityService $availabilityService,
    ) {}

    public function getTerrainSlots(Request $request, int $terrainId): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $terrain = Stadium::findOrFail($terrainId);
        $excludeFixtureId = $request->integer('exclude_fixture_id') ?: null;
        $excludeBookingId = $request->integer('exclude_booking_id') ?: null;
        $forTournamentId = $request->integer('tournament_id') ?: null;

        $detailed = $this->availabilityService->getDetailedSlotsForDate(
            terrain: $terrain,
            date: $request->date,
            excludeFixtureId: $excludeFixtureId,
            excludeBookingId: $excludeBookingId,
            forTournamentId: $forTournamentId,
        );

        return response()->json($detailed);
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
        $unavailableMsg = null;
        $weekPrice = $terrain->price_per_team ?? 0;

        $booking = null;

        DB::transaction(function () use ($validated, $terrain, $isWeekly, &$conflictMsg, &$unavailableMsg, &$weekPrice, &$booking, $user, $team) {
            \App\Domains\Stadium\Models\Stadium::where('id', $validated['terrain_id'])->lockForUpdate()->first();
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

            $closure = TerrainSlotClosure::where('terrain_id', $validated['terrain_id'])
                ->where('closure_date', $dateToLock)
                ->where('start_time', '<', $validated['end_time'])
                ->where('end_time', '>', $validated['start_time'])
                ->first();

            if ($closure) {
                $unavailableMsg = $closure->reason
                    ? "هذا التوقيت مغلق — {$closure->reason}"
                    : 'هذا التوقيت مغلق — لا يمكن الحجز';
                return;
            }

            $price = $terrain->price_per_team ?? 0;

            if ($isWeekly) {
                $weeks = 4;
                if (! empty($validated['end_date'])) {
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
            return response()->json(['message' => $conflictMsg], 409);
        }

        if ($unavailableMsg) {
            return response()->json(['message' => $unavailableMsg], 422);
        }

        if (! $booking) {
            return response()->json(['message' => 'تعذر إنشاء الحجز'], 500);
        }

        $booking->load(['terrain.owner', 'team', 'manager']);
        $booking->terrain?->owner?->makeVisible('phone');
        $booking->subscription_dates = $booking->getSubscriptionDates();

        event(new BookingCreated($booking));

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

        $weekData = $this->availabilityService->getDetailedSlotsForWeek($terrain, $startOfWeek->toDateString(), $weeks);
        $days = $weekData['days'] ?? [];

        // Attach manager summaries and metadata to days slots
        foreach ($days as &$day) {
            foreach ($day['slots'] as &$slot) {
                if (! empty($slot['booking']['manager']['id'])) {
                    $mgr = User::find($slot['booking']['manager']['id']);
                    $slot['booking']['manager'] = $this->managerSummary($mgr);
                }
            }
        }
        unset($day, $slot);

        $pendingBookings = TerrainBooking::where('terrain_id', $terrainId)
            ->where('status', 'pending')
            ->whereNull('archived_at')
            ->whereNull('cancelled_at')
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
                    'guest_name' => $booking->guest_name,
                    'guest_phone' => $booking->guest_phone,
                    'guest_email' => $booking->guest_email,
                    'is_guest' => $booking->isGuest(),
                    'terrain' => $booking->terrain?->only(['id', 'name']),
                    'whatsapp_notification_url' => $this->whatsapp->buildBookingRequestMessage($booking),
                ];
            });

        // Compute stats
        $totalBookings = TerrainBooking::where('terrain_id', $terrainId)
            ->whereIn('status', ['pending', 'approved', 'confirmed'])
            ->whereNull('archived_at')
            ->whereNull('cancelled_at')
            ->count();
        $activeSubscriptions = TerrainBooking::where('terrain_id', $terrainId)
            ->where('reservation_type', 'weekly_subscription')
            ->whereIn('status', ['approved', 'confirmed'])
            ->whereNull('archived_at')
            ->whereNull('cancelled_at')
            ->count();

        $emptySlots = 0;
        foreach ($days as $d) {
            foreach ($d['slots'] as $s) {
                if ($s['status'] === 'available') {
                    $emptySlots++;
                }
            }
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
                return response()->json(['message' => $conflictMsg], 409);
            }
        } else {
            $statusToSet = $validated['status'];
            DB::transaction(function () use ($booking, $statusToSet) {
                $bookingLock = TerrainBooking::where('id', $booking->id)->lockForUpdate()->first();
                if ($bookingLock->status !== 'pending') {
                    return;
                }
                $updateData = ['status' => $statusToSet];
                if ($statusToSet === 'cancelled') {
                    $updateData['cancelled_at'] = now();
                }
                $bookingLock->update($updateData);
            });
            $booking->refresh();
            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate($booking->terrain_id, $booking->booking_date?->toDateString());
        }

        $booking->load(['manager', 'team', 'terrain']);

        $status = $validated['status'];

        match ($status) {
            'approved' => event(new BookingApproved($booking)),
            'rejected' => event(new BookingRejected($booking)),
            'completed' => event(new BookingCompleted($booking)),
            'cancelled' => event(new BookingCancelled($booking, $user)),
            default => null,
        };

        if ($booking->manager_id) {
            $notificationMap = [
                'approved' => ['reservation_approved', 'تم تأكيد حجز الملعب', "صاحب الملعب {$booking->terrain?->name} قام بتأكيد حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}"],
                'rejected' => ['reservation_rejected', 'تم رفض حجز الملعب', "صاحب الملعب {$booking->terrain?->name} قام برفض حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}"],
                'completed' => ['booking_completed', 'اكتمال الحجز', "تم تحديد حجزك في ملعب {$booking->terrain?->name} كمكتمل."],
                'cancelled' => ['booking_cancellation', 'تم إلغاء الحجز', "صاحب الملعب {$booking->terrain?->name} قام بإلغاء حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}."],
            ];

            if (isset($notificationMap[$status])) {
                [$type, $title, $body] = $notificationMap[$status];
                NotificationService::push(
                    (int) $booking->manager_id,
                    $type,
                    $title,
                    $body,
                    ['booking_id' => $booking->id, 'terrain_id' => $booking->terrain_id],
                    '/dashboard/my-reservations',
                );
            }
        }

        $response = [
            'message' => match ($status) {
                'approved' => 'تم تأكيد الحجز بنجاح',
                'rejected' => 'تم رفض الحجز',
                'completed' => 'تم تحديد المباراة كمكتملة',
                'cancelled' => 'تم إلغاء الحجز',
            },
            'booking' => $booking,
        ];

        if (in_array($status, ['approved', 'rejected'])) {
            $response['whatsapp_notification_url'] = $this->whatsapp
                ->buildOwnerDecisionMessage($booking, $status);
        }

        return response()->json($response);
    }

    public function getManagers(Request $request): JsonResponse
    {
        $query = User::query()
            ->where('role', 'manager')
            ->where('status', 'approved')
            ->with(['team', 'activeTeam']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('team', function ($tq) use ($search) {
                        $tq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $managers = $query->orderBy('name')->limit(100)->get()->map(function ($m) {
            $team = $m->team ?? $m->activeTeam;
            return [
                'id' => $m->id,
                'name' => $m->name,
                'phone' => $m->phone,
                'email' => $m->email,
                'avatar_url' => $m->avatar_url ?? $m->avatar_thumbnail_url,
                'team_id' => $team?->id,
                'team_name' => $team?->name,
                'team_logo' => $team?->logo_url ?? $team?->logo_path,
            ];
        });

        return response()->json(['data' => $managers]);
    }

    public function ownerCreateGuestBooking(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();

        $terrain = Stadium::where('id', $terrainId)
            ->where('owner_id', $user->id)
            ->firstOrFail();

        foreach (['booking_date', 'start_date', 'end_date'] as $dateField) {
            if ($request->filled($dateField)) {
                try {
                    $request->merge([
                        $dateField => Carbon::parse($request->input($dateField))->format('Y-m-d'),
                    ]);
                } catch (\Exception $e) {}
            }
        }

        if ($request->input('reservation_type') === 'weekly_subscription' && ! $request->filled('day_of_week') && $request->filled('start_date')) {
            try {
                $request->merge([
                    'day_of_week' => Carbon::parse($request->input('start_date'))->dayOfWeek,
                ]);
            } catch (\Exception $e) {}
        }

        $validated = $request->validate([
            'reservation_type' => 'required|in:single,weekly_subscription',
            'booking_date' => 'required_if:reservation_type,single|nullable|date|after_or_equal:today',
            'day_of_week' => 'required_if:reservation_type,weekly_subscription|nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'required_if:reservation_type,weekly_subscription|nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'booking_type' => 'required|in:training,private,match',
            'manager_id' => 'nullable|integer|exists:users,id',
            'guest_name' => 'required_without:manager_id|nullable|string|max:255',
            'guest_phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-() ]+$/'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'notes' => 'nullable|string|max:500',
        ]);

        $manager = null;
        $managerId = null;
        $teamId = null;

        if (! empty($validated['manager_id'])) {
            $manager = User::where('id', $validated['manager_id'])
                ->where('role', 'manager')
                ->first();

            if ($manager) {
                $managerId = $manager->id;
                $team = $manager->team ?? $manager->activeTeam ?? \App\Domains\Team\Models\Team::where('manager_id', $manager->id)->first();
                $teamId = $team?->id;
            }
        }

        $guestName = ! empty($validated['guest_name'])
            ? trim($validated['guest_name'])
            : ($manager?->name ?? 'زبون');

        $guestPhone = ! empty($validated['guest_phone'])
            ? trim($validated['guest_phone'])
            : $manager?->phone;

        $guestEmail = ! empty($validated['guest_email'])
            ? trim($validated['guest_email'])
            : $manager?->email;

        if (empty($guestPhone) && empty($guestEmail)) {
            return response()->json(['message' => 'يجب إدخال رقم الهاتف أو البريد الإلكتروني للزبون'], 422);
        }

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
        $conflictMsg = null;
        $unavailableMsg = null;
        DB::transaction(function () use ($terrainId, $validated, $isWeekly, $managerId, $teamId, $guestName, $guestPhone, $guestEmail, $terrain, &$guestBooking, &$conflictMsg, &$unavailableMsg) {
            \App\Domains\Stadium\Models\Stadium::where('id', $terrainId)->lockForUpdate()->first();
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

            // Working hours
            $schedule = TerrainSchedule::where('terrain_id', $terrainId)
                ->where('day_of_week', Carbon::parse($dateToLock)->dayOfWeek)
                ->where('is_active', true)
                ->first();

            if (! $schedule) {
                $unavailableMsg = 'الملعب غير متاح في هذا اليوم';
                return;
            }

            if ($validated['start_time'] < $schedule->open_time || $validated['end_time'] > $schedule->close_time) {
                $unavailableMsg = 'التوقيت المطلوب خارج ساعات عمل الملعب';
                return;
            }

            // Slot closures
            $closure = TerrainSlotClosure::where('terrain_id', $terrainId)
                ->where('closure_date', $dateToLock)
                ->where('start_time', '<', $validated['end_time'])
                ->where('end_time', '>', $validated['start_time'])
                ->first();

            if ($closure) {
                $unavailableMsg = $closure->reason
                    ? "هذا التوقيت مغلق — {$closure->reason}"
                    : 'هذا التوقيت مغلق — لا يمكن الحجز';
                return;
            }

            // Tournament fixture reservations on this terrain (2h slot convention)
            $bookingStartAt = Carbon::parse($dateToLock.' '.$validated['start_time']);
            $bookingEndAt = Carbon::parse($dateToLock.' '.$validated['end_time']);
            $fixtureConflict = Fixture::where('stadium_id', $terrainId)
                ->where('scheduled_at', '<', $bookingEndAt)
                ->where('scheduled_at', '>', $bookingStartAt->copy()->subHours(2))
                ->first();

            if ($fixtureConflict) {
                $unavailableMsg = 'هذا التوقيت محجوز لمباراة ضمن مسابقة';
                return;
            }

            $price = $terrain->price_per_team ?? 0;
            if ($isWeekly) {
                $weeks = 4;
                if (! empty($validated['end_date'])) {
                    $weeks = (int) ceil(Carbon::parse($validated['start_date'])->diffInWeeks(Carbon::parse($validated['end_date'])) ?: 4);
                }
                $price = $price * $weeks;
            }

            $guestBooking = TerrainBooking::create([
                'terrain_id' => $terrainId,
                'manager_id' => $managerId,
                'team_id' => $teamId,
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
                'guest_name' => $guestName,
                'guest_phone' => $guestPhone,
                'guest_email' => $guestEmail,
                'booking_reference' => TerrainBooking::generateReference(),
                'uuid' => (string) Str::uuid(),
            ]);
        });

        if ($conflictMsg) {
            return response()->json(['message' => $conflictMsg], 409);
        }

        if ($unavailableMsg) {
            return response()->json(['message' => $unavailableMsg], 422);
        }

        if (! $guestBooking) {
            return response()->json(['message' => 'تعذر إنشاء الحجز'], 500);
        }

        if ($managerId) {
            event(new BookingApproved($guestBooking));
        }

        $guestBooking->load(['terrain.owner', 'manager', 'team']);

        $whatsappUrl = $this->whatsapp->buildOwnerDecisionMessage($guestBooking, 'approved');

        return response()->json([
            'message' => 'تم إنشاء الحجز بنجاح',
            'booking' => $guestBooking,
            'whatsapp_notification_url' => $whatsappUrl ?: null,
        ], 201);
    }

    public function forceDeleteBooking(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        $booking = TerrainBooking::whereHas('terrain', function ($q) use ($user) {
            $q->where('owner_id', $user->id);
        })->where('id', $bookingId)->firstOrFail();

        $booking->load(['terrain', 'manager']);
        $terrainName = $booking->terrain?->name ?? 'الملعب';
        $bookingDate = $booking->booking_date?->format('Y-m-d')
            ?? ($booking->start_date ? Carbon::parse($booking->start_date)->format('Y-m-d') : '');

        // If registered manager, send cancellation notification
        if ($booking->manager_id) {
            try {
                NotificationService::push(
                    (int) $booking->manager_id,
                    'booking_cancellation',
                    'تم إلغاء وحذف الحجز إجبارياً',
                    "قام صاحب الملعب {$terrainName} بحذف وإلغاء الحجز رقم #{$booking->id} المقرّر بتاريخ {$bookingDate}.",
                    ['terrain_id' => $booking->terrain_id],
                    '/dashboard/my-reservations'
                );
            } catch (\Exception $e) {}
        }

        $booking->delete();

        return response()->json([
            'message' => 'تم حذف الحجز إجبارياً بنجاح وتحرير الموعد.',
        ]);
    }

    public function bulkClearBookings(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();

        $terrain = Stadium::where('id', $terrainId)
            ->where('owner_id', $user->id)
            ->firstOrFail();

        $validated = $request->validate([
            'terrain_name_confirmation' => 'required|string',
        ]);

        if (trim($validated['terrain_name_confirmation']) !== trim($terrain->name)) {
            return response()->json([
                'message' => 'اسم الملعب المدخل غير مطابق لتأكيد الحذف.',
            ], 422);
        }

        // Notify affected registered managers before deletion
        $bookings = TerrainBooking::where('terrain_id', $terrainId)
            ->whereNotNull('manager_id')
            ->whereIn('status', ['confirmed', 'approved', 'pending'])
            ->get();

        foreach ($bookings as $b) {
            try {
                NotificationService::push(
                    (int) $b->manager_id,
                    'booking_cancellation',
                    'تم إلغاء الحجز',
                    "تم إلغاء حجزك في ملعب {$terrain->name} نظراً لتفريغ جدول الحجوزات من قبل إدارة الملعب.",
                    ['terrain_id' => $terrain->id],
                    '/dashboard/my-reservations'
                );
            } catch (\Exception $e) {}
        }

        $deletedCount = TerrainBooking::where('terrain_id', $terrainId)->delete();

        return response()->json([
            'message' => "تم حذف كافة الحجوزات ({$deletedCount} حجز) بنجاح وتفريغ جدول الملعب بالكامل.",
            'deleted_count' => $deletedCount,
        ]);
    }

    public function getManagerBookings(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();
        $filter = $request->input('filter', 'upcoming');
        $perPage = (int) $request->input('per_page', 30);

        $query = TerrainBooking::with(['terrain:id,name,city,type', 'team:id,name'])
            ->where('manager_id', $user->id)
            ->whereNull('match_request_id');

        $query = match ($filter) {
            'upcoming' => $query->whereIn('status', ['pending', 'confirmed', 'approved'])
                ->whereNull('archived_at')
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
                }),
            'past' => $query->whereIn('status', ['confirmed', 'approved', 'completed'])
                ->where(function ($q) use ($today) {
                    $q->where(function ($sq) use ($today) {
                        $sq->where('reservation_type', 'single')
                            ->whereDate('booking_date', '<', $today);
                    })
                        ->orWhere(function ($sq) use ($today) {
                            $sq->where('reservation_type', 'weekly_subscription')
                                ->whereNotNull('end_date')
                                ->whereDate('end_date', '<', $today);
                        });
                }),
            'cancelled' => $query->whereIn('status', ['cancelled', 'rejected']),
            'all' => $query->whereIn('status', ['pending', 'confirmed', 'approved', 'completed', 'cancelled', 'rejected']),
            default => $query->whereIn('status', ['pending', 'confirmed', 'approved'])->whereNull('archived_at'),
        };

        $bookings = $query->orderBy('booking_date', 'desc')
            ->orderBy('start_time')
            ->paginate($perPage);

        $bookings->getCollection()->transform(function ($b) {
            $b->next_date = $b->displayDate()?->toDateString();
            $b->subscription_status = $this->getSubscriptionStatus($b);
            $b->occurrences_remaining = $this->getOccurrencesRemaining($b);
            $b->subscription_dates = $b->getSubscriptionDates();

            return $b;
        });

        $counts = $this->getBookingCounts($user->id);

        return response()->json([
            'bookings' => $bookings->items(),
            'counts' => $counts,
            'pagination' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
            ],
        ]);
    }

    private function getSubscriptionStatus(TerrainBooking $booking): string
    {
        if (! $booking->isWeeklySubscription()) {
            return 'not_subscription';
        }

        if ($booking->status !== 'approved' && $booking->status !== 'confirmed') {
            return 'inactive';
        }

        return $booking->isActiveSubscription() ? 'active' : 'expired';
    }

    private function getOccurrencesRemaining(TerrainBooking $booking): ?int
    {
        if (! $booking->isWeeklySubscription() || ! $booking->isActiveSubscription()) {
            return null;
        }

        $today = Carbon::today();
        $end = $booking->end_date ? $booking->end_date->copy() : $today->copy()->addMonths(6);
        $dow = $booking->day_of_week;

        $count = 0;
        $cursor = $today->copy();
        $daysAhead = ($dow - $cursor->dayOfWeek + 7) % 7;
        $cursor = $cursor->addDays($daysAhead);

        while ($cursor->lte($end) && $count < 52) {
            if ($booking->coversDate($cursor)) {
                $count++;
            }
            $cursor = $cursor->addWeek();
        }

        return $count;
    }

    private function getBookingCounts(int $managerId): array
    {
        $today = Carbon::today()->toDateString();

        $baseQuery = TerrainBooking::where('manager_id', $managerId)
            ->whereNull('match_request_id');

        $upcoming = (clone $baseQuery)->whereIn('status', ['pending', 'confirmed', 'approved'])
            ->whereNull('archived_at')
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
            })->count();

        $past = (clone $baseQuery)->whereIn('status', ['confirmed', 'approved', 'completed'])
            ->where(function ($q) use ($today) {
                $q->where(function ($sq) use ($today) {
                    $sq->where('reservation_type', 'single')
                        ->whereDate('booking_date', '<', $today);
                })
                    ->orWhere(function ($sq) use ($today) {
                        $sq->where('reservation_type', 'weekly_subscription')
                            ->whereNotNull('end_date')
                            ->whereDate('end_date', '<', $today);
                    });
            })->count();

        $cancelled = (clone $baseQuery)->whereIn('status', ['cancelled', 'rejected'])->count();

        $all = (clone $baseQuery)->whereIn('status', ['pending', 'confirmed', 'approved', 'completed', 'cancelled', 'rejected'])->count();

        return [
            'upcoming' => $upcoming,
            'past' => $past,
            'cancelled' => $cancelled,
            'all' => $all,
        ];
    }

    public function myReservations(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today();

        $bookings = TerrainBooking::where('terrain_id', $terrainId)
            ->where('manager_id', $user->id)
            ->whereNull('match_request_id')
            ->whereNull('archived_at')
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

        $cancellation = null;
        $duplicateMsg = null;

        DB::transaction(function () use ($booking, $bookingId, $validated, $user, &$cancellation, &$duplicateMsg) {
            TerrainBooking::where('id', $bookingId)->lockForUpdate()->first();

            $existing = CancellationRequest::where('terrain_booking_id', $bookingId)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();

            if ($existing) {
                $duplicateMsg = 'طلب إلغاء موجود بالفعل';
                return;
            }

            $cancellation = CancellationRequest::create([
                'terrain_booking_id' => $bookingId,
                'user_id' => $user->id,
                'reason' => $validated['reason'] ?? null,
                'status' => 'pending',
            ]);
        });

        if ($duplicateMsg) {
            return response()->json(['message' => $duplicateMsg], 409);
        }

        $booking->load('terrain.owner');
        if ($booking->terrain?->owner_id) {
            NotificationService::push(
                (int) $booking->terrain->owner_id,
                'cancellation_requested',
                'طلب إلغاء حجز',
                "المسير {$user->name} يطلب إلغاء حجز ملعب {$booking->terrain->name} في تاريخ {$booking->booking_date?->format('Y-m-d')}",
                ['booking_id' => $booking->id, 'cancellation_id' => $cancellation->id],
                '/owner/bookings',
            );
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
            'profile_image' => $manager->playerProfile?->photo_url,
        ];
    }
}
