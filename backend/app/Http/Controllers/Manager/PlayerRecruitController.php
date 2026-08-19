<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;
use App\Domains\Match\Services\PlayerMatchGuard;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlayerRecruitController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'city' => 'nullable|string|max:255',
            'position' => 'nullable|in:goalkeeper,defender,midfielder,forward',
            'skill_level' => 'nullable|in:beginner,amateur,semi_pro,pro',
            'search' => 'nullable|string|max:255',
        ]);

        $query = PlayerProfile::with('user')
            ->whereHas('user', function ($q) {
                $q->where('role', 'player')->where('status', 'approved');
            });

        if ($request->filled('city')) {
            $query->where('city', $request->query('city'));
        }

        if ($request->filled('position')) {
            $query->where('position', $request->query('position'));
        }

        if ($request->filled('skill_level')) {
            $query->where('skill_level', $request->query('skill_level'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $players = $query
            ->orderByDesc('points')
            ->paginate(20);

        return response()->json([
            'players' => $players->items(),
            'current_page' => $players->currentPage(),
            'last_page' => $players->lastPage(),
            'per_page' => $players->perPage(),
            'total' => $players->total(),
        ]);
    }

    public function invite(Request $request, int $playerId): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'match_request_id' => 'required|exists:match_requests,id',
            'message' => 'nullable|string|max:1000',
        ]);

        $player = User::with('playerProfile')
            ->where('role', 'player')
            ->where('status', 'approved')
            ->findOrFail($playerId);

        $match = MatchRequest::with('hostTeam')
            ->where('id', $validated['match_request_id'])
            ->firstOrFail();

        if ($match->host_team_id !== $user->team->id) {
            return response()->json(['message' => 'لا يمكنك دعوة لاعب لهذه المباراة'], 403);
        }

        $exists = PlayerMatchRequest::where('player_id', $playerId)
            ->where('match_request_id', $match->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'تم التواصل مع هذا اللاعب من قبل لهذه المباراة'], 409);
        }

        $request_ = PlayerMatchRequest::create([
            'player_id' => $playerId,
            'match_request_id' => $match->id,
            'type' => 'invite',
            'status' => 'pending',
            'message' => $validated['message'] ?? null,
        ]);

        NotificationService::push(
            (int) $playerId,
            'player_invite_received',
            'دعوة للانضمام لمباراة',
            "فريق {$user->team->name} يدعوك للانضمام لمباراته",
            ['player_match_request_id' => $request_->id, 'match_request_id' => $match->id],
            '/player/applications',
        );

        return response()->json([
            'message' => 'تم إرسال الدعوة للاعب بنجاح',
            'request' => $request_,
        ], 201);
    }

    public function applicants(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $match = MatchRequest::where('id', $matchId)
            ->where('host_team_id', $user->team->id)
            ->firstOrFail();

        $applications = PlayerMatchRequest::with('player.playerProfile')
            ->where('match_request_id', $matchId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'match_request' => $match->load(['hostTeam', 'stadium']),
            'applications' => $applications,
        ]);
    }

    public function respond(Request $request, int $applicationId): JsonResponse
    {
        $user = $request->user();

        if (! $user->team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $validated = $request->validate([
            'action' => 'required|in:accept,decline',
        ]);

        $application = PlayerMatchRequest::with('matchRequest.hostTeam')
            ->where('type', 'apply')
            ->findOrFail($applicationId);

        $match = $application->matchRequest;

        if ($match->host_team_id !== $user->team->id) {
            return response()->json(['message' => 'لا يمكنك الرد على هذا الطلب'], 403);
        }

        if ($application->status !== 'pending') {
            return response()->json(['message' => 'هذا الطلب لم يعد متاحاً'], 400);
        }

        if ($validated['action'] === 'decline') {
            $application->update(['status' => 'declined']);

            $this->notifyPlayer($application->player_id, 'player_application_declined', 'تم رفض طلبك', 'عذراً، تم رفض طلب الانضمام الخاص بك');

            return response()->json([
                'message' => 'تم رفض الطلب',
                'application' => $application,
            ]);
        }

        return DB::transaction(function () use ($application, $match) {
            $match = MatchRequest::with('hostTeam')->lockForUpdate()->find($match->id);

            if ($match->status !== 'open') {
                return response()->json(['message' => 'هذه المباراة لم تعد متاحة'], 400);
            }

            if ($match->needs_players) {
                if (PlayerMatchGuard::isFull($match)) {
                    return response()->json(['message' => 'اكتمل عدد اللاعبين المطلوب لهذه المباراة'], 422);
                }

                if (PlayerMatchGuard::hasTimeConflict($application->player_id, $match)) {
                    return response()->json(['message' => 'اللاعب مرتبط بمباراة أخرى في نفس التوقيت'], 422);
                }

                $application->update(['status' => 'accepted']);

                $this->notifyPlayer($application->player_id, 'player_application_accepted', 'تم قبول طلبك', "تم قبول طلبك للانضمام لمباراة فريق {$match->hostTeam->name}");

                return response()->json([
                    'message' => 'تم قبول اللاعب بنجاح',
                    'application' => $application->fresh(),
                    'match_request' => $match->load(['hostTeam', 'stadium']),
                ]);
            }

            if (! empty($match->mercenary_player_id)) {
                return response()->json(['message' => 'تم اختيار لاعب آخر لهذه المباراة'], 400);
            }

            $application->update(['status' => 'accepted']);
            $match->update([
                'mercenary_player_id' => $application->player_id,
                'status' => 'accepted',
            ]);

            PlayerMatchRequest::where('match_request_id', $match->id)
                ->where('player_id', '!=', $application->player_id)
                ->where('status', 'pending')
                ->update(['status' => 'declined']);

            $this->notifyPlayer($application->player_id, 'player_application_accepted', 'تم قبول طلبك', "تم قبول طلبك للانضمام لمباراة فريق {$match->hostTeam->name}");

            return response()->json([
                'message' => 'تم قبول اللاعب بنجاح',
                'application' => $application->fresh(),
                'match_request' => $match->load(['hostTeam', 'stadium']),
            ]);
        });
    }

    private function notifyPlayer(int $playerId, string $type, string $title, string $body): void
    {
        NotificationService::push($playerId, $type, $title, $body, [], '/player/applications');
    }
}
