<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Services\ManagerRosterService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function __construct(private ManagerRosterService $roster) {}

    public function index(Request $request): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $players = $this->roster->list($teamId);

        return response()->json(['players' => $players]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'phone' => 'nullable|string|max:20',
            'is_whatsapp' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $teamId = $request->user()->team->id;

        $currentCount = Player::where('team_id', $teamId)->count();
        $maxMembers = (int) Setting::get('max_team_members', 30);
        if ($currentCount >= $maxMembers) {
            return response()->json(['message' => 'تم الوصول للحد الأقصى لأعضاء الفريق'], 422);
        }

        $player = $this->roster->create($teamId, $validated);

        return response()->json([
            'message' => 'تم إضافة اللاعب بنجاح',
            'player' => $player,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $player = $this->roster->findForTeam($teamId, $id);
        abort_unless($player, 404);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'phone' => 'nullable|string|max:20',
            'is_whatsapp' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $player = $this->roster->update($player, $validated);

        return response()->json([
            'message' => 'تم تحديث بيانات اللاعب بنجاح',
            'player' => $player->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $player = $this->roster->findForTeam($teamId, $id);
        abort_unless($player, 404);

        $this->roster->delete($player);

        return response()->json([
            'message' => 'تم حذف اللاعب بنجاح',
        ]);
    }
}
