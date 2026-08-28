<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use App\Http\Requests\Committee\CreateMatchPlayerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeTeamPlayerController extends Controller
{
    public function index(Request $request, Team $team): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $players = Player::query()
            ->where('team_id', $team->id)
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('number', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%");
            }))
            ->orderBy('is_essential', 'desc')
            ->orderBy('name')
            ->limit(120)
            ->get(['id', 'team_id', 'name', 'number', 'position', 'is_essential']);

        return response()->json(['data' => $players]);
    }

    public function store(CreateMatchPlayerRequest $request, Team $team): JsonResponse
    {
        $name = trim($request->input('name'));

        $duplicates = Player::query()
            ->where('team_id', $team->id)
            ->where('name', $name)
            ->get(['id', 'team_id', 'name', 'number', 'position']);

        if ($duplicates->isNotEmpty() && ! $request->boolean('force')) {
            return response()->json([
                'created' => false,
                'duplicates' => $duplicates->values(),
                'message' => 'يوجد لاعب بنفس الاسم',
            ], 200);
        }

        $player = Player::query()->create([
            'team_id' => $team->id,
            'name' => $name,
            'number' => $request->input('number') ? (int) $request->input('number') : null,
            'position' => $request->input('position') ?: null,
            'notes' => $request->input('notes') ?: null,
        ]);

        return response()->json([
            'data' => $player->only(['id', 'team_id', 'name', 'number', 'position', 'is_essential']),
            'created' => true,
            'duplicates' => $duplicates->values(),
            'message' => 'تمت إضافة اللاعب إلى قائمة الفريق',
        ], 201);
    }
}
