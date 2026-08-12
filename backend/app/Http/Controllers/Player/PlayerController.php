<?php

namespace App\Http\Controllers\Player;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;
use App\Domains\Match\Queries\MatchFeedQuery;
use App\Domains\Match\Services\PlayerMatchGuard;
use App\Domains\Notification\Models\AppNotification;
use App\Domains\Shared\Base\Controller;
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

        return response()->json([
            'matches' => $matches->items(),
            'current_page' => $matches->currentPage(),
            'last_page' => $matches->lastPage(),
            'per_page' => $matches->perPage(),
            'total' => $matches->total(),
        ]);
    }

    public function apply(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'message' => 'nullable|string|max:1000',
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

        $application = PlayerMatchRequest::create([
            'player_id' => $user->id,
            'match_request_id' => $matchId,
            'type' => 'apply',
            'status' => 'pending',
            'message' => $validated['message'] ?? null,
        ]);

        AppNotification::create([
            'user_id' => $match->hostTeam->manager_id,
            'type' => 'player_application_received',
            'title' => 'طلب انضمام لاعب',
            'body' => "اللاعب {$user->name} طلب الانضمام لمباراتك",
            'data' => ['player_match_request_id' => $application->id, 'match_request_id' => $matchId],
            'action_url' => '/dashboard',
        ]);

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

                AppNotification::create([
                    'user_id' => $match->hostTeam->manager_id,
                    'type' => 'player_invite_accepted',
                    'title' => 'اللاعب قبل الدعوة',
                    'body' => "اللاعب {$user->name} قبل دعوة الانضمام لمباراتك",
                    'data' => ['match_request_id' => $match->id],
                    'action_url' => '/dashboard',
                ]);

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

            AppNotification::create([
                'user_id' => $match->hostTeam->manager_id,
                'type' => 'player_invite_accepted',
                'title' => 'اللاعب قبل الدعوة',
                'body' => "اللاعب {$user->name} قبل دعوة الانضمام لمباراتك",
                'data' => ['match_request_id' => $match->id],
                'action_url' => '/dashboard',
            ]);

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
        $profile = $request->user()->playerProfile;

        $total = $profile?->matches_played ?? 0;
        $wins = $profile?->wins ?? 0;
        $draws = $profile?->draws ?? 0;
        $losses = $profile?->losses ?? 0;

        return response()->json([
            'stats' => [
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
            ],
        ]);
    }
}
