<?php

namespace App\Http\Controllers\Public;

use App\Domains\Match\Models\MatchChallengeProposal;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchInvitationController extends Controller
{
    public function __construct(
        private CurrentTeamResolver $teamResolver,
    ) {}

    public function show(string $token): JsonResponse
    {
        $match = MatchRequest::with([
            'hostTeam.manager:id,name,phone,is_whatsapp',
            'opponentTeam',
            'stadium.images',
        ])
            ->withCount(['proposals as pending_proposals_count' => fn ($q) => $q->where('status', 'pending')])
            ->where('invitation_token', $token)
            ->first();

        if (! $match) {
            return response()->json(['message' => 'رابط التحدي غير صالح أو غير موجود'], 404);
        }

        $matchData = [
            'id' => $match->id,
            'invitation_token' => $match->invitation_token,
            'status' => $match->status,
            'type' => $match->type,
            'match_datetime' => $match->match_datetime,
            'custom_terrain_name' => $match->custom_terrain_name,
            'notes' => $match->notes,
            'price_per_player' => $match->price_per_player,
            'player_format' => $match->player_format,
            'needs_players' => (bool) $match->needs_players,
            'players_needed' => $match->players_needed,
            'is_guest' => (bool) $match->is_guest,
            'guest_team_name' => $match->guest_team_name,
            'host_team' => $match->hostTeam ? [
                'id' => $match->hostTeam->id,
                'name' => $match->hostTeam->name,
                'logo' => $match->hostTeam->logo_url,
                'logo_url' => $match->hostTeam->logo_url,
                'logo_thumbnail_url' => $match->hostTeam->logo_thumbnail_url,
                'primary_color' => $match->hostTeam->primary_color,
                'city' => $match->hostTeam->city,
                'manager_id' => $match->hostTeam->manager_id,
            ] : null,
            'host_manager' => $match->hostTeam?->manager ? [
                'name' => $match->hostTeam->manager->name,
            ] : null,
            'opponent_team' => $match->opponentTeam ? [
                'id' => $match->opponentTeam->id,
                'name' => $match->opponentTeam->name,
                'logo' => $match->opponentTeam->logo_url,
                'logo_url' => $match->opponentTeam->logo_url,
                'logo_thumbnail_url' => $match->opponentTeam->logo_thumbnail_url,
                'primary_color' => $match->opponentTeam->primary_color,
                'city' => $match->opponentTeam->city,
            ] : null,
            'stadium' => $match->stadium ? [
                'id' => $match->stadium->id,
                'name' => $match->stadium->name,
                'city' => $match->stadium->city,
                'address' => $match->stadium->address,
                'image' => $match->stadium->images->first()?->image_path ?? null,
            ] : null,
            'pending_proposals_count' => $match->pending_proposals_count,
        ];

        return response()->json([
            'match' => $matchData,
            'match_request' => $matchData,
        ]);
    }

    public function applyGuest(Request $request, string $token): JsonResponse
    {
        $match = MatchRequest::with(['hostTeam.manager'])
            ->where('invitation_token', $token)
            ->first();

        if (! $match) {
            return response()->json(['message' => 'رابط التحدي غير صالح أو غير موجود'], 404);
        }

        if ($match->status !== 'open') {
            return response()->json(['message' => 'عذراً، هذه المباراة لم تعد متاحة لاستقبال طلبات التحدي'], 422);
        }

        $validated = $request->validate([
            'guest_team_name' => 'required|string|max:100',
            'guest_contact_name' => 'required|string|max:100',
            'guest_phone' => 'required|string|max:30',
            'notes' => 'nullable|string|max:500',
        ]);

        $proposal = MatchChallengeProposal::create([
            'match_request_id' => $match->id,
            'type' => 'guest',
            'guest_team_name' => $validated['guest_team_name'],
            'guest_contact_name' => $validated['guest_contact_name'],
            'guest_phone' => $validated['guest_phone'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        if ($match->hostTeam?->manager_id) {
            NotificationService::push(
                (int) $match->hostTeam->manager_id,
                'challenge_proposal_received',
                'طلب تحدي جديد (ضيف)',
                "تلقيت طلب تحدي من فريق الضيف [{$validated['guest_team_name']}] لمباراة {$match->match_datetime}",
                ['match_request_id' => $match->id, 'proposal_id' => $proposal->id],
                '/dashboard',
            );
        }

        return response()->json([
            'message' => 'تم إرسال طلب التحدي بنجاح! سيقوم منظم المباراة بمراجعة الطلبات واختيار المنافس.',
            'proposal' => $proposal,
        ], 201);
    }

    public function applyTeam(Request $request, string $token): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'يرجى تسجيل الدخول أولاً'], 401);
        }

        try {
            $team = $this->teamResolver->for($user);
        } catch (\Throwable $e) {
            $team = $user->team ?? $user->managedTeams()->first();
        }

        if (! $team) {
            return response()->json(['message' => 'يجب إنشاء فريق معتمد لتقديم التحدي كفريق رسمي'], 422);
        }

        $match = MatchRequest::with(['hostTeam.manager'])
            ->where('invitation_token', $token)
            ->first();

        if (! $match) {
            return response()->json(['message' => 'رابط التحدي غير صالح أو غير موجود'], 404);
        }

        if ($match->status !== 'open') {
            return response()->json(['message' => 'عذراً، هذه المباراة لم تعد متاحة لاستقبال طلبات التحدي'], 422);
        }

        if ($match->host_team_id === $team->id) {
            return response()->json(['message' => 'لا يمكنك تحدي فريقك الخاص'], 422);
        }

        // Check for existing pending proposal by this team
        $existing = MatchChallengeProposal::where('match_request_id', $match->id)
            ->where('team_id', $team->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'لقد أرسلت طلباً للتحدي مسبقاً وبانتظار رد المنظم'], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $proposal = MatchChallengeProposal::create([
            'match_request_id' => $match->id,
            'type' => 'registered',
            'team_id' => $team->id,
            'user_id' => $user->id,
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        if ($match->hostTeam?->manager_id) {
            NotificationService::push(
                (int) $match->hostTeam->manager_id,
                'challenge_proposal_received',
                'طلب تحدي جديد',
                "تلقيت طلب تحدي من فريق [{$team->name}] لمباراة {$match->match_datetime}",
                ['match_request_id' => $match->id, 'proposal_id' => $proposal->id],
                '/dashboard',
            );
        }

        return response()->json([
            'message' => 'تم إرسال طلب التحدي بنجاح! بانتظار تأكيد منظم المباراة.',
            'proposal' => $proposal->load('team'),
        ], 201);
    }
}
