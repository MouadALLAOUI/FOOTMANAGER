<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeTeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        $query = Team::query()
            ->with(['manager', 'currentManager'])
            // Include both free teams and approved manager teams; exclude declined (rejected / blocked) manager teams
            ->where(function ($q) {
                // 1. Free teams / teams without any manager
                $q->where('is_free', true)
                    ->orWhere(function ($sq) {
                        $sq->whereNull('manager_id')
                            ->whereDoesntHave('currentManager');
                    })
                    // 2. Approved manager teams
                    ->orWhere(function ($sq) {
                        $sq->whereHas('manager', fn ($mq) => $mq->where('status', 'approved'))
                            ->orWhereHas('currentManager', fn ($mq) => $mq->where('status', 'approved'));
                    });
            })
            // Exclude teams belonging to declined / rejected / blocked managers
            ->whereDoesntHave('manager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']))
            ->whereDoesntHave('currentManager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']))
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhereHas('manager', fn ($mq) => $mq->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                    ->orWhereHas('currentManager', fn ($mq) => $mq->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
            });
        }

        $teams = $query->limit(100)->get(['id', 'name', 'city', 'logo_path', 'logo_url', 'manager_id', 'category', 'is_free']);

        return response()->json([
            'data' => $teams->map(function (Team $team) {
                $manager = $team->manager ?? $team->currentManager;
                $isApprovedManager = $manager && $manager->status === 'approved';

                return [
                    'id' => $team->id,
                    'name' => $team->name,
                    'city' => $team->city,
                    'logo_url' => $team->logo_url,
                    'category' => $team->category,
                    'is_free' => (bool) ($team->is_free || ! $isApprovedManager),
                    'manager_name' => $isApprovedManager ? $manager->name : null,
                    'manager_phone' => $isApprovedManager ? $manager->phone : null,
                ];
            })->all(),
        ]);
    }
}
