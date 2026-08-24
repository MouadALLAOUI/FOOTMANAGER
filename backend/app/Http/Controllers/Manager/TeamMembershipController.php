<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Player\Models\Player;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Team\Services\ManagerRosterService;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamMembershipController extends Controller
{
    public function __construct(
        private ManagerRosterService $roster,
    ) {}

    /**
     * List active permanent team members.
     */
    public function index(Request $request): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $players = $this->roster->activeMembers($teamId);

        return response()->json(['players' => $players]);
    }

    /**
     * List essential players only.
     */
    public function essential(Request $request): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $players = $this->roster->essentialPlayers($teamId);

        return response()->json(['players' => $players]);
    }

    /**
     * Add an existing user (player) to the manager's team.
     *
     * The user must have role=player and not already belong to a team.
     */
    public function addMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'is_essential' => 'sometimes|boolean',
        ]);

        $manager = $request->user();
        $team = $manager->team;

        if (! $team) {
            return response()->json(['message' => 'ليس لديك فريق'], 404);
        }

        $targetUser = User::findOrFail($validated['user_id']);

        // Prevent adding non-player users
        if ($targetUser->role !== 'player') {
            return response()->json(['message' => 'المستخدم ليس لاعباً'], 422);
        }

        // Prevent adding non-approved users
        if ($targetUser->status !== 'approved') {
            return response()->json(['message' => 'اللاعب غير معتمد'], 422);
        }

        // Check if user already belongs to a team
        $existingPlayer = Player::where('user_id', $targetUser->id)
            ->where('status', Player::STATUS_ACTIVE)
            ->first();

        if ($existingPlayer) {
            return response()->json(['message' => 'اللاعب ينتمي بالفعل لفريق آخر'], 422);
        }

        // Check squad size limit
        $currentCount = Player::where('team_id', $team->id)
            ->active()
            ->count();

        if ($currentCount >= $team->max_squad_size) {
            return response()->json(['message' => 'تم الوصول للحد الأقصى لأعضاء الفريق'], 422);
        }

        // Check for duplicate (inactive player with same user_id on this team)
        $inactivePlayer = Player::where('team_id', $team->id)
            ->where('user_id', $targetUser->id)
            ->where('status', '!=', Player::STATUS_ACTIVE)
            ->first();

        if ($inactivePlayer) {
            // Reactivate instead of creating duplicate
            $inactivePlayer->update([
                'status' => Player::STATUS_ACTIVE,
                'position' => $validated['position'] ?? $inactivePlayer->position,
                'number' => $validated['number'] ?? $inactivePlayer->number,
                'is_essential' => $validated['is_essential'] ?? false,
            ]);

            $player = $inactivePlayer->fresh();
        } else {
            // Resolve profile name if available
            $profileName = $targetUser->playerProfile?->full_name ?? $targetUser->name;

            $player = Player::create([
                'team_id' => $team->id,
                'user_id' => $targetUser->id,
                'name' => $profileName,
                'position' => $validated['position'] ?? null,
                'number' => $validated['number'] ?? null,
                'is_essential' => $validated['is_essential'] ?? false,
                'status' => Player::STATUS_ACTIVE,
                'joined_at' => now()->toDateString(),
            ]);
        }

        // Notify the player
        NotificationService::push(
            userId: $targetUser->id,
            type: 'team_member_added',
            title: 'عضو جديد في الفريق',
            body: "تمت إضافتك بشكل دائم إلى فريق {$team->name} بواسطة المدير.",
            data: [
                'team_id' => $team->id,
                'team_name' => $team->name,
                'player_id' => $player->id,
                'position' => $player->position,
                'is_essential' => $player->is_essential,
            ],
            actionUrl: "/player",
        );

        return response()->json([
            'message' => 'تمت إضافة اللاعب للفريق بنجاح',
            'player' => $player->fresh(['user', 'playerProfile']),
        ], 201);
    }

    /**
     * Remove a player from the team (soft-remove: set inactive).
     * Historical match records are preserved.
     */
    public function removeMember(Request $request, int $id): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $player = $this->roster->findForTeam($teamId, $id);
        abort_unless($player, 404);

        $playerName = $player->name;
        $team = $request->user()->team;

        $player = $this->roster->removeMember($player);

        // Notify the player if they have a user account
        if ($player->user_id) {
            NotificationService::push(
                userId: $player->user_id,
                type: 'team_member_removed',
                title: 'تم حذفك من الفريق',
                body: "تمت إزالتك من فريق {$team->name} من قبل المدير.",
                data: [
                    'team_id' => $team->id,
                    'team_name' => $team->name,
                    'player_id' => $player->id,
                ],
                actionUrl: "/player",
                important: true,
            );
        }

        return response()->json([
            'message' => "تم حذف اللاعب {$playerName} من الفريق",
        ]);
    }

    /**
     * Toggle a player's essential status.
     */
    public function toggleEssential(Request $request, int $id): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $player = $this->roster->findForTeam($teamId, $id);
        abort_unless($player, 404);

        $player = $this->roster->toggleEssential($player);

        $statusText = $player->is_essential ? 'essential' : 'non-essential';

        return response()->json([
            'message' => $player->is_essential
                ? 'تم تحديد اللاعب كلاعب أساسي'
                : 'تم إزالة اللاعب من الأساسيين',
            'player' => $player,
        ]);
    }

    /**
     * Change a player's team position.
     * Notifies the player of the position change.
     */
    public function changePosition(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'position' => 'required|string|max:100',
        ]);

        $teamId = $request->user()->team->id;

        $player = $this->roster->findForTeam($teamId, $id);
        abort_unless($player, 404);

        $oldPosition = $player->position;
        $newPosition = $validated['position'];

        if ($oldPosition === $newPosition) {
            return response()->json(['message' => 'المركز لم يتغير', 'player' => $player]);
        }

        $positionResult = $this->roster->changePosition($player, $newPosition);

        // Notify the player of position change
        if ($player->user_id) {
            $team = $request->user()->team;

            $positionLabels = [
                'goalkeeper' => 'حارس مرمى',
                'defender' => 'مدافع',
                'midfielder' => 'وسط ميدان',
                'forward' => 'مهاجم',
            ];

            $oldLabel = $positionLabels[$oldPosition] ?? $oldPosition;
            $newLabel = $positionLabels[$newPosition] ?? $newPosition;

            NotificationService::push(
                userId: $player->user_id,
                type: 'team_position_changed',
                title: 'تم تغيير مركزك في الفريق',
                body: "تم تغيير مركزك في فريق {$team->name} من \"{$oldLabel}\" إلى \"{$newLabel}\".",
                data: [
                    'team_id' => $team->id,
                    'team_name' => $team->name,
                    'player_id' => $player->id,
                    'old_position' => $oldPosition,
                    'new_position' => $newPosition,
                    'old_position_label' => $oldLabel,
                    'new_position_label' => $newLabel,
                ],
                actionUrl: "/player",
            );
        }

        return response()->json([
            'message' => 'تم تغيير المركز بنجاح',
            'player' => $player->fresh(),
        ]);
    }

    /**
     * Player-side: view own team membership info.
     */
    public function myTeam(Request $request): JsonResponse
    {
        $user = $request->user();

        $player = Player::where('user_id', $user->id)
            ->where('status', Player::STATUS_ACTIVE)
            ->with(['team', 'playerProfile'])
            ->first();

        if (! $player) {
            return response()->json([
                'membership' => null,
                'team' => null,
            ]);
        }

        // Get all active teammates
        $teammates = Player::where('team_id', $player->team_id)
            ->active()
            ->with(['user' => fn ($q) => $q->select('id', 'name', 'avatar_path', 'avatar_thumbnail_path')])
            ->orderBy('number')
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'position' => $t->position,
                'number' => $t->number,
                'is_essential' => $t->is_essential,
                'role' => $t->role,
                'avatar_url' => $t->user?->avatar_url,
            ]);

        return response()->json([
            'membership' => [
                'player_id' => $player->id,
                'position' => $player->position,
                'number' => $player->number,
                'is_essential' => $player->is_essential,
                'role' => $player->role,
                'joined_at' => $player->joined_at,
            ],
            'team' => [
                'id' => $player->team->id,
                'name' => $player->team->name,
                'logo_url' => $player->team->logo_url,
                'city' => $player->team->city,
                'category' => $player->team->category,
                'member_count' => Player::where('team_id', $player->team->id)->active()->count(),
            ],
            'teammates' => $teammates,
        ]);
    }
}
