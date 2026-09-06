<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Models\Team;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerTeamController extends Controller
{
    public function __construct(
        private CurrentTeamResolver $resolver,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $teams = Team::with(['primaryStadium'])
            ->withCount(['players', 'hostedMatches', 'opponentMatches'])
            ->where('manager_id', $user->id)
            ->orderBy('created_at', 'asc')
            ->get();

        $currentTeam = null;
        try {
            $currentTeam = $this->resolver->for($user);
        } catch (\Throwable) {
            $currentTeam = $teams->first();
        }

        return response()->json([
            'teams' => $teams,
            'current_team_id' => $currentTeam?->id ?? $user->current_team_id,
            'current_team' => $currentTeam,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:adult,teenager,children',
            'city' => 'nullable|string|max:255',
            'level' => 'nullable|string|max:255',
            'association_name' => 'nullable|string|max:255',
            'primary_stadium_id' => 'nullable|exists:stadiums,id',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:1000',
            'member_count' => 'nullable|integer|min:1',
            'max_squad_size' => 'nullable|integer|min:5|max:50',
        ]);

        $validated['manager_id'] = $user->id;
        $validated['member_count'] = $validated['member_count'] ?? 1;
        $validated['primary_color'] = $validated['primary_color'] ?? '#22c55e';
        $validated['secondary_color'] = $validated['secondary_color'] ?? '#0ea5e9';

        $team = Team::create($validated);

        // Set newly created team as the active current team
        $user->update(['current_team_id' => $team->id]);

        $team->load(['primaryStadium']);

        return response()->json([
            'message' => 'تم إنشاء الفريق بنجاح!',
            'team' => $team,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $team = Team::with(['primaryStadium', 'manager'])
            ->where('id', $id)
            ->where('manager_id', $user->id)
            ->first();

        if (! $team) {
            throw new AuthorizationException('غير مصرح لك بالوصول إلى هذا الفريق');
        }

        return response()->json(['team' => $team]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $team = Team::where('id', $id)
            ->where('manager_id', $user->id)
            ->first();

        if (! $team) {
            throw new AuthorizationException('غير مصرح لك بالوصول إلى هذا الفريق');
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|in:adult,teenager,children',
            'city' => 'nullable|string|max:255',
            'region' => 'nullable|string|max:255',
            'level' => 'nullable|string|max:255',
            'association_name' => 'nullable|string|max:255',
            'primary_stadium_id' => 'nullable|exists:stadiums,id',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:1000',
            'member_count' => 'nullable|integer|min:1',
        ]);

        $team->update($validated);
        $team->load(['primaryStadium', 'manager']);

        return response()->json([
            'message' => 'تم تحديث بيانات الفريق بنجاح!',
            'team' => $team,
        ]);
    }

    public function switchTeam(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'team_id' => 'required|integer|exists:teams,id',
        ]);

        $team = Team::with(['primaryStadium'])
            ->where('id', $validated['team_id'])
            ->where('manager_id', $user->id)
            ->first();

        if (! $team) {
            throw new AuthorizationException('غير مصرح لك باختيار هذا الفريق');
        }

        $user->update(['current_team_id' => $team->id]);

        return response()->json([
            'message' => 'تم تبديل الفريق النشط بنجاح',
            'current_team_id' => $team->id,
            'current_team' => $team,
        ]);
    }
}
