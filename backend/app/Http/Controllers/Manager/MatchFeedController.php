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

class MatchFeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        $query = MatchRequest::with(['hostTeam.manager', 'stadium.images'])
            ->where('status', 'open')
            ->where('host_team_id', '!=', $teamId)
            ->where(function ($q) {
                $q->where('type', 'public_request')
                  ->orWhereNull('type');
            })
            ->whereHas('hostTeam.manager', function ($q) {
                $q->where('status', 'approved');
            })
            ->orderBy('match_datetime', 'asc');

        if ($request->filled('stadium_id')) {
            $query->where('stadium_id', $request->query('stadium_id'));
        }

        if ($request->filled('category')) {
            $query->whereHas('hostTeam', function ($q) use ($request) {
                $q->where('category', $request->query('category'));
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('match_datetime', $request->query('date'));
        }

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

        if (!$user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $teamId = $user->team->id;

        return DB::transaction(function () use ($id, $teamId, $user) {
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

            $matchRequest->update([
                'opponent_team_id' => $teamId,
                'status' => 'accepted',
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

            AppNotification::create([
                'user_id' => $matchRequest->hostTeam->manager_id,
                'type' => 'match_accepted',
                'title' => 'تم قبول طلب المباراة',
                'body' => "الفريق {$user->team?->name} قبل طلب المباراة في {$matchRequest->match_datetime}",
                'data' => ['match_request_id' => $matchRequest->id],
                'action_url' => '/dashboard',
            ]);

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
    }
}
