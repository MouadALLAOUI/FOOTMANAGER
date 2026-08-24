<?php

namespace App\Http\Controllers\Player;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;
use App\Domains\Match\Queries\MatchFeedQuery;
use App\Domains\Match\Services\PlayerMatchGuard;
use App\Domains\Match\Services\PositionService;
use App\Domains\Notification\Models\AppNotification;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Player\Models\PlayerTeamRequest;
use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PlayerController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user()->load('playerProfile');

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'is_whatsapp'),
            'profile' => $user->playerProfile,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20|unique:users,phone,'.$request->user()->id,
            'email' => 'sometimes|nullable|email|max:255|unique:users,email,'.$request->user()->id,
            'is_whatsapp' => 'boolean',
            'position' => 'nullable|in:goalkeeper,defender,midfielder,forward',
            'skill_level' => 'nullable|in:beginner,amateur,semi_pro,pro',
            'birth_year' => 'nullable|integer|min:1950|max:'.date('Y'),
            'city' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'is_available' => 'boolean',
        ]);

        $user = $request->user();

        $user->update(array_intersect_key($validated, [
            'name' => 1,
            'phone' => 1,
            'email' => 1,
            'is_whatsapp' => 1,
        ]));

        $profileData = array_intersect_key($validated, [
            'position' => 1,
            'skill_level' => 1,
            'birth_year' => 1,
            'city' => 1,
            'description' => 1,
            'is_available' => 1,
        ]);

        if (! empty($profileData)) {
            $user->playerProfile()->updateOrCreate([], $profileData);
        }

        $user->load('playerProfile');

        return response()->json([
            'message' => 'تم تحديث الملف الشخصي بنجاح',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'is_whatsapp'),
            'profile' => $user->playerProfile,
        ]);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $user = $request->user();
        $profile = $user->playerProfile()->firstOrCreate([]);

        if ($profile->photo_path && ! str_starts_with($profile->photo_path, 'http')) {
            Storage::disk('public')->delete($profile->photo_path);
        }

        if ($profile->photo_thumbnail_path && ! str_starts_with($profile->photo_thumbnail_path, 'http')) {
            Storage::disk('public')->delete($profile->photo_thumbnail_path);
        }

        $result = app(\App\Domains\Shared\Services\ImageThumbnailService::class)
            ->storeWithThumbnail($request->file('photo'), 'player_profiles/photos');
        $profile->update([
            'photo_path' => $result['path'],
            'photo_thumbnail_path' => $result['thumbnail_path'],
        ]);

        return response()->json([
            'message' => 'تم تحديث الصورة بنجاح',
            'profile' => $profile->fresh(),
        ]);
    }

    public function matchFeed(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = MatchFeedQuery::base(null);
        $query = MatchFeedQuery::applyFilters($query, $request);

        $query->whereNotIn('id', function ($q) use ($user) {
            $q->select('match_request_id')
                ->from('player_match_requests')
                ->where('player_id', $user->id);
        });

        if ($user->playerProfile?->city) {
            $query->where(function ($q) use ($user) {
                $q->whereHas('hostTeam', fn ($team) => $team->where('city', $user->playerProfile->city))
                    ->orWhere('mercenary_player_id', null);
            });
        }

        $matches = $query->paginate(20);

        $items = $matches->items();
        $enriched = array_map(function ($m) {
            $arr = $m->toArray();
            $arr['position_availability'] = PositionService::getPositionAvailability($m);
            $arr['host_manager_name'] = $m->hostTeam?->manager?->name;
            return $arr;
        }, $items);

        return response()->json([
            'matches' => $enriched,
            'current_page' => $matches->currentPage(),
            'last_page' => $matches->lastPage(),
            'per_page' => $matches->perPage(),
            'total' => $matches->total(),
        ]);
    }

    public function matchDetail(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();

        $match = MatchRequest::with([
            'hostTeam',
            'hostTeam.manager:id,name',
            'stadium:id,name,city,type,player_format,cover_image_url',
        ])
            ->where('status', 'open')
            ->findOrFail($matchId);

        $positionAvailability = PositionService::getPositionAvailability($match);

        $myApplication = PlayerMatchRequest::where('player_id', $user->id)
            ->where('match_request_id', $matchId)
            ->first();

        $managerData = null;
        if ($match->hostTeam?->manager) {
            $m = $match->hostTeam->manager;
            $managerData = [
                'id' => $m->id,
                'name' => $m->name,
                'avatar_url' => $m->avatar_url ?? null,
                'team' => [
                    'id' => $match->hostTeam->id,
                    'name' => $match->hostTeam->name,
                    'city' => $match->hostTeam->city,
                    'logo_url' => $match->hostTeam->logo_url ?? null,
                    'category' => $match->hostTeam->category ?? null,
                ],
            ];
        }

        return response()->json([
            'match' => [
                'id' => $match->id,
                'status' => $match->status,
                'match_datetime' => $match->match_datetime,
                'notes' => $match->notes,
                'price_per_player' => $match->price_per_player,
                'player_format' => $match->player_format,
                'needs_players' => $match->needs_players,
                'players_needed' => $match->players_needed,
                'players_joined' => $match->players_joined,
                'players_remaining' => $match->players_remaining,
                'players_full' => $match->players_full,
                'custom_terrain_name' => $match->custom_terrain_name,
            ],
            'stadium' => $match->stadium ? [
                'id' => $match->stadium->id,
                'name' => $match->stadium->name,
                'city' => $match->stadium->city,
                'type' => $match->stadium->type,
                'player_format' => $match->stadium->player_format,
                'cover_image_url' => $match->stadium->cover_image_url,
            ] : null,
            'manager' => $managerData,
            'positions_needed' => $match->positions_needed,
            'position_availability' => $positionAvailability,
            'my_application' => $myApplication ? [
                'id' => $myApplication->id,
                'status' => $myApplication->status,
                'position' => $myApplication->position,
            ] : null,
        ]);
    }

    public function apply(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'message' => 'nullable|string|max:1000',
            'position' => ['nullable', 'string', 'in:'.implode(',', PositionService::VALID_POSITIONS)],
        ]);

        $match = MatchRequest::with('hostTeam.manager')
            ->where('status', 'open')
            ->findOrFail($matchId);

        $exists = PlayerMatchRequest::where('player_id', $user->id)
            ->where('match_request_id', $matchId)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'لقد تقدمت بالفعل لهذه المباراة'], 409);
        }

        if ($match->needs_players && PlayerMatchGuard::isFull($match)) {
            return response()->json(['message' => 'اكتمل عدد اللاعبين المطلوب لهذه المباراة'], 422);
        }

        if (PlayerMatchGuard::hasTimeConflict($user->id, $match)) {
            return response()->json(['message' => 'لديك مباراة أخرى في نفس التوقيت'], 422);
        }

        $position = $validated['position'] ?? null;

        if (PositionService::hasPositionRequirements($match)) {
            if (! $position) {
                return response()->json(['message' => 'يجب اختيار مركز اللعب'], 422);
            }

            if (! array_key_exists($position, $match->positions_needed)) {
                return response()->json(['message' => 'المركز المختار غير مطلوب في هذه المباراة'], 422);
            }

            if (PositionService::isPositionFull($match, $position)) {
                return response()->json(['message' => 'هذا المركز مكتمل بالفعل'], 422);
            }
        }

        $application = PlayerMatchRequest::create([
            'player_id' => $user->id,
            'match_request_id' => $matchId,
            'type' => 'apply',
            'status' => 'pending',
            'position' => $position,
            'message' => $validated['message'] ?? null,
        ]);

        NotificationService::push(
            (int) $match->hostTeam->manager_id,
            'player_application_received',
            'طلب انضمام لاعب',
            "اللاعب {$user->name} طلب الانضمام لمباراتك",
            ['player_match_request_id' => $application->id, 'match_request_id' => $matchId],
            '/dashboard',
        );

        return response()->json([
            'message' => 'تم إرسال طلب الانضمام بنجاح، بانتظار تأكيد المسير',
            'application' => $application,
        ], 201);
    }

    public function applications(Request $request): JsonResponse
    {
        $applications = PlayerMatchRequest::with([
            'matchRequest.hostTeam.manager',
            'matchRequest.stadium.images',
        ])
            ->where('player_id', $request->user()->id)
            ->orderBy('updated_at', 'desc')
            ->paginate(20);

        return response()->json([
            'applications' => $applications->items(),
            'current_page' => $applications->currentPage(),
            'last_page' => $applications->lastPage(),
            'per_page' => $applications->perPage(),
            'total' => $applications->total(),
        ]);
    }

    public function respond(Request $request, int $applicationId): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'action' => 'required|in:accept,decline',
        ]);

        $application = PlayerMatchRequest::with('matchRequest')
            ->where('player_id', $user->id)
            ->where('type', 'invite')
            ->findOrFail($applicationId);

        if ($application->status !== 'pending') {
            return response()->json(['message' => 'هذه الدعوة لم تعد متاحة'], 400);
        }

        if ($validated['action'] === 'decline') {
            $application->update(['status' => 'declined']);

            return response()->json([
                'message' => 'تم رفض الدعوة',
                'application' => $application,
            ]);
        }

        return DB::transaction(function () use ($application, $user) {
            $match = MatchRequest::with('hostTeam.manager')->lockForUpdate()->findOrFail($application->match_request_id);

            if ($match->status !== 'open') {
                return response()->json(['message' => 'هذه المباراة لم تعد متاحة'], 400);
            }

            if ($match->needs_players) {
                if (PlayerMatchGuard::isFull($match)) {
                    return response()->json(['message' => 'اكتمل عدد اللاعبين المطلوب لهذه المباراة'], 422);
                }

                if (PlayerMatchGuard::hasTimeConflict($user->id, $match)) {
                    return response()->json(['message' => 'لديك مباراة أخرى في نفس التوقيت'], 422);
                }

                $application->update(['status' => 'accepted']);

                NotificationService::push(
                    (int) $match->hostTeam->manager_id,
                    'player_invite_accepted',
                    'اللاعب قبل الدعوة',
                    "اللاعب {$user->name} قبل دعوة الانضمام لمباراتك",
                    ['match_request_id' => $match->id],
                    '/dashboard',
                );

                return response()->json([
                    'message' => 'تم قبول الدعوة والانضمام للمباراة بنجاح',
                    'application' => $application->fresh(),
                    'match_request' => $match->load(['hostTeam', 'stadium']),
                ]);
            }

            if (! empty($match->mercenary_player_id)) {
                return response()->json(['message' => 'عذراً، تم اختيار لاعب آخر لهذه المباراة'], 400);
            }

            $application->update(['status' => 'accepted']);
            $match->update([
                'mercenary_player_id' => $user->id,
                'status' => 'accepted',
            ]);

            NotificationService::push(
                (int) $match->hostTeam->manager_id,
                'player_invite_accepted',
                'اللاعب قبل الدعوة',
                "اللاعب {$user->name} قبل دعوة الانضمام لمباراتك",
                ['match_request_id' => $match->id],
                '/dashboard',
            );

            return response()->json([
                'message' => 'تم قبول الدعوة والانضمام للمباراة بنجاح',
                'application' => $application->fresh(),
                'match_request' => $match->load(['hostTeam', 'stadium']),
            ]);
        });
    }

    public function cancel(Request $request, int $applicationId): JsonResponse
    {
        $application = PlayerMatchRequest::where('player_id', $request->user()->id)
            ->where('type', 'apply')
            ->findOrFail($applicationId);

        if ($application->status !== 'pending') {
            return response()->json(['message' => 'لا يمكنك إلغاء هذا الطلب الآن'], 400);
        }

        $application->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'تم إلغاء الطلب',
            'application' => $application,
        ]);
    }

    public function matches(Request $request): JsonResponse
    {
        $matches = MatchRequest::with([
            'hostTeam.manager',
            'stadium.images',
            'mercenary',
        ])
            ->where('mercenary_player_id', $request->user()->id)
            ->orderBy('match_datetime', 'desc')
            ->paginate(20);

        return response()->json([
            'matches' => $matches->items(),
            'current_page' => $matches->currentPage(),
            'last_page' => $matches->lastPage(),
            'per_page' => $matches->perPage(),
            'total' => $matches->total(),
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        return response()->json([
            'stats' => $this->statsFor($request->user()),
        ]);
    }

    private function statsFor(User $user): array
    {
        $profile = $user->playerProfile;

        $total = $profile?->matches_played ?? 0;
        $wins = $profile?->wins ?? 0;
        $draws = $profile?->draws ?? 0;
        $losses = $profile?->losses ?? 0;

        return [
            'points' => $profile?->points ?? 0,
            'rating' => $profile?->rating ?? 0,
            'matches_played' => $total,
            'wins' => $wins,
            'draws' => $draws,
            'losses' => $losses,
            'win_rate' => $total > 0 ? round(($wins / $total) * 100, 1) : 0,
            'position' => $profile?->position,
            'skill_level' => $profile?->skill_level,
            'is_available' => $profile?->is_available ?? true,
        ];
    }

    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['playerProfile', 'rosterPlayer.team.manager', 'rosterPlayer.team.primaryStadium']);

        $upcomingBase = MatchRequest::with([
            'hostTeam.manager',
            'hostTeam.primaryStadium',
            'opponentTeam',
            'stadium.images',
            'mercenary',
        ])
            ->where('match_datetime', '>=', now())
            ->whereIn('status', ['open', 'accepted'])
            ->where(function ($query) use ($user) {
                $query->where('mercenary_player_id', $user->id)
                    ->orWhereIn('id', PlayerMatchRequest::query()
                        ->where('player_id', $user->id)
                        ->where('status', 'accepted')
                        ->pluck('match_request_id'));
            })
            ->orderBy('match_datetime', 'asc');

        $upcomingMatch = (clone $upcomingBase)->first();
        $upcomingMatches = (clone $upcomingBase)->limit(3)->get();

        $feedQuery = MatchFeedQuery::base(null);
        $feedQuery = MatchFeedQuery::applyFilters($feedQuery, $request);

        $feedQuery->whereNotIn('id', function ($query) use ($user) {
            $query->select('match_request_id')
                ->from('player_match_requests')
                ->where('player_id', $user->id);
        });

        if ($user->playerProfile?->city) {
            $feedQuery->where(function ($query) use ($user) {
                $query->whereHas('hostTeam', fn ($team) => $team->where('city', $user->playerProfile->city))
                    ->orWhere('mercenary_player_id', null);
            });
        }

        $feed = $feedQuery->limit(3)->get();

        $notifications = AppNotification::where('user_id', $user->id)
            ->where(function ($query) {
                $query->where('is_important', true)
                    ->orWhere('is_read', false);
            })
            ->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        $team = $user->rosterPlayer?->team;

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'is_whatsapp'),
            'profile' => $user->playerProfile,
            'stats' => $this->statsFor($user),
            'upcoming_match' => $upcomingMatch,
            'upcoming_matches' => $upcomingMatches,
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'logo' => $team->logo_thumbnail_url ?: $team->logo_url,
                'category' => $team->category,
                'level' => $team->level,
                'city' => $team->city,
                'primary_stadium' => $team->primaryStadium?->name,
                'manager' => $team->manager?->name,
            ] : null,
            'team_request' => PlayerTeamRequest::where('player_id', $user->id)
                ->latest()
                ->first(),
            'feed' => $feed,
            'notifications' => $notifications,
            'unread_count' => AppNotification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count(),
        ]);
    }

    public function storeTeamRequest(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'team_name' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:2000',
        ]);

        if ($user->rosterPlayer?->team_id) {
            return response()->json(['message' => 'أنت منضم لفريق بالفعل'], 422);
        }

        $hasPending = PlayerTeamRequest::where('player_id', $user->id)
            ->where('status', PlayerTeamRequest::STATUS_PENDING)
            ->exists();

        if ($hasPending) {
            return response()->json(['message' => 'لديك طلب قيد المراجعة بالفعل'], 409);
        }

        $teamRequest = PlayerTeamRequest::create([
            'player_id' => $user->id,
            'team_name' => $validated['team_name'] ?? null,
            'message' => $validated['message'] ?? null,
            'status' => PlayerTeamRequest::STATUS_PENDING,
        ]);

        User::whereIn('role', ['admin', 'sub_admin'])
            ->where('status', 'approved')
            ->pluck('id')
            ->each(function (int $adminId) use ($user, $teamRequest) {
                NotificationService::push(
                    $adminId,
                    'team_formation_request',
                    'طلب تشكيل فريق جديد',
                    "اللاعب {$user->name} يطلب تشكيل فريق جديد",
                    ['player_team_request_id' => $teamRequest->id, 'player_id' => $user->id],
                    '/admin',
                );
            });

        return response()->json([
            'message' => 'تم إرسال طلب تشكيل الفريق بنجاح، بانتظار مراجعة الإدارة',
            'team_request' => $teamRequest,
        ], 201);
    }

    public function teamRequests(Request $request): JsonResponse
    {
        $user = $request->user();

        $requests = PlayerTeamRequest::with(['handler'])
            ->where('player_id', $user->id)
            ->latest()
            ->get();

        $enriched = $requests->map(function ($r) {
            return [
                'id' => $r->id,
                'team_name' => $r->team_name,
                'status' => $r->status,
                'message' => $r->message,
                'rejection_reason' => $r->rejection_reason,
                'created_at' => $r->created_at,
                'updated_at' => $r->updated_at,
                'handled_by_name' => $r->handler?->name,
                'handled_at' => $r->handled_by ? $r->updated_at : null,
            ];
        });

        return response()->json([
            'requests' => $enriched,
        ]);
    }

    public function cancelTeamRequest(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $teamRequest = PlayerTeamRequest::where('id', $id)
            ->where('player_id', $user->id)
            ->firstOrFail();

        if ($teamRequest->status !== PlayerTeamRequest::STATUS_PENDING) {
            return response()->json(['message' => 'لا يمكن إلغاء هذا الطلب بعد معالجته'], 422);
        }

        $teamRequest->update([
            'status' => PlayerTeamRequest::STATUS_CANCELLED,
        ]);

        return response()->json([
            'message' => 'تم إلغاء الطلب بنجاح',
            'request' => $teamRequest->fresh(),
        ]);
    }
}
