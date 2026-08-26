<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Match\Queries\MatchFeedQuery;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MatchFeedController extends Controller
{
    public function __construct(
        private SubscriptionService $subscription,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $query = MatchFeedQuery::base($teamId);
        $query = MatchFeedQuery::applyFilters($query, $request);

        $matches = $query->paginate(20);

        return response()->json([
            'matches' => $matches->items(),
            'current_page' => $matches->currentPage(),
            'last_page' => $matches->lastPage(),
            'per_page' => $matches->perPage(),
            'total' => $matches->total(),
        ]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $this->subscription->authorizeResource(
            $user,
            'friendly_match_requests',
            $this->subscription->currentUsage($user, 'friendly_match_requests'),
        );

        $validated = $request->validate([
            'needs_players' => 'sometimes|boolean',
            'players_needed' => 'nullable|integer|min:1|max:50|required_if:needs_players,true',
        ]);

        $needsPlayers = (bool) ($validated['needs_players'] ?? false);

        try {
            return DB::transaction(function () use ($id, $teamId, $user, $needsPlayers, $validated) {
                $matchRequest = MatchRequest::with(['hostTeam.manager', 'stadium.images'])
                    ->where('id', $id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($matchRequest->status !== 'open') {
                    return response()->json([
                        'message' => 'عذراً، هذه المباراة لم تعد متاحة',
                    ], 400);
                }

                if ($matchRequest->host_team_id == $teamId) {
                    return response()->json([
                        'message' => 'لا يمكنك قبول طلب مباراة فريقك',
                    ], 403);
                }

                if ($matchRequest->hostTeam->manager->status !== 'approved') {
                    return response()->json([
                        'message' => 'عذراً، هذا الحساب لم يعد متاحاً',
                    ], 403);
                }

                if (! empty($matchRequest->stadium_id)) {
                    $terrain = Stadium::find($matchRequest->stadium_id);
                    if (! $terrain || ! $terrain->is_open) {
                        throw new \RuntimeException('الملعب غير متاح حالياً — لا يمكن تأكيد المباراة');
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
$dateTime->copy()->addHours((int) Setting::get('default_match_hours', 2))->format('H:i')
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
                        'end_time' => $dateTime->copy()->addHours((int) Setting::get('default_match_hours', 2))->format('H:i'),
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

                $matchRequest->load(['hostTeam.manager', 'stadium']);
                $matchRequest->hostTeam->manager->makeVisible('phone', 'is_whatsapp');

                NotificationService::push(
                    (int) $matchRequest->hostTeam->manager_id,
                    'match_accepted',
                    'تم قبول طلب المباراة',
                    "الفريق {$user->team?->name} قبل طلب المباراة في {$matchRequest->match_datetime}",
                    ['match_request_id' => $matchRequest->id],
                    '/dashboard',
                );

                return response()->json([
                    'message' => 'تم تأكيد المباراة بنجاح! يمكنك الآن التواصل مع مسير الفريق المنظم',
                    'match_request' => $matchRequest,
                    'host_manager' => [
                        'name' => $matchRequest->hostTeam->manager->name,
                        'phone' => $matchRequest->hostTeam->manager->phone,
                        'is_whatsapp' => $matchRequest->hostTeam->manager->is_whatsapp,
                    ],
                ]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
