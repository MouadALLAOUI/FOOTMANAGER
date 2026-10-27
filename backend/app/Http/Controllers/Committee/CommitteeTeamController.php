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
            ->with('manager:id,name,phone')
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhereHas('manager', fn ($mq) => $mq->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
            });
        }

        $teams = $query->limit(60)->get(['id', 'name', 'city', 'logo_path', 'logo_url', 'manager_id', 'category']);

        return response()->json([
            'data' => $teams->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'logo_url' => $team->logo_url,
                'category' => $team->category,
                'manager_name' => $team->manager?->name,
                'manager_phone' => $team->manager?->phone,
            ])->all(),
        ]);
    }
}
