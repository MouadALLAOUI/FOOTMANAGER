<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'all');
        $search = trim((string) $request->query('search', ''));
        $sortBy = $request->query('sort_by', 'id');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = min(100, max(1, (int) $request->query('per_page', 15)));

        $query = Team::query()
            ->with(['manager', 'currentManager'])
            ->withCount(['players', 'tournamentTeams as tournaments_count']);

        if ($type === 'free') {
            $query->where(function ($q) {
                $q->where('is_free', true)
                    ->orWhere(function ($sq) {
                        $sq->whereNull('manager_id')
                            ->whereDoesntHave('currentManager');
                    })
                    ->orWhereHas('manager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']))
                    ->orWhereHas('currentManager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']));
            });
        } elseif ($type === 'manager') {
            $query->where('is_free', false)
                ->where(function ($q) {
                    $q->where(function ($sq) {
                        $sq->whereNotNull('manager_id')
                            ->orWhereHas('currentManager');
                    })
                    ->whereDoesntHave('manager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']))
                    ->whereDoesntHave('currentManager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']));
                });
        }

        if ($search !== '') {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('association_name', 'like', "%{$search}%")
                    ->orWhereHas('manager', function ($mq) use ($search) {
                        $mq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('currentManager', function ($mq) use ($search) {
                        $mq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $allowedSorts = ['id', 'name', 'created_at', 'matches_played', 'points'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('id', 'desc');
        }

        $paginator = $query->paginate($perPage)->withQueryString();

        $stats = [
            'total' => Team::query()->count(),
            'free' => Team::query()->where(function ($q) {
                $q->where('is_free', true)
                    ->orWhere(function ($sq) {
                        $sq->whereNull('manager_id')
                            ->whereDoesntHave('currentManager');
                    })
                    ->orWhereHas('manager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']))
                    ->orWhereHas('currentManager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']));
            })->count(),
            'manager' => Team::query()->where('is_free', false)->where(function ($q) {
                $q->where(function ($sq) {
                    $sq->whereNotNull('manager_id')
                        ->orWhereHas('currentManager');
                })
                ->whereDoesntHave('manager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']))
                ->whereDoesntHave('currentManager', fn ($mq) => $mq->whereIn('status', ['rejected', 'blocked']));
            })->count(),
        ];

        $items = $paginator->getCollection()->map(function (Team $team) {
            $manager = $team->manager ?? $team->currentManager;
            $hasActiveManager = $manager !== null && ! in_array($manager->status, ['rejected', 'blocked'], true);
            $isFree = (bool) $team->is_free || ! $hasActiveManager;

            return [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'category' => $team->category,
                'level' => $team->level,
                'association_name' => $team->association_name,
                'logo_url' => $team->logo_url,
                'is_free' => $isFree,
                'created_at' => $team->created_at?->toIso8601String(),
                'matches_played' => (int) $team->matches_played,
                'points' => (int) $team->points,
                'players_count' => (int) $team->players_count,
                'tournaments_count' => (int) $team->tournaments_count,
                'can_delete' => $isFree,
                'manager' => $manager ? [
                    'id' => $manager->id,
                    'name' => $manager->name,
                    'phone' => $manager->phone,
                    'email' => $manager->email,
                    'status' => $manager->status,
                ] : null,
                'manager_name' => $manager?->name,
                'manager_phone' => $manager?->phone,
            ];
        });

        return response()->json([
            'teams' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'stats' => $stats,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $team = Team::with(['manager', 'currentManager'])->findOrFail($id);

        $manager = $team->manager ?? $team->currentManager;
        $hasActiveManager = $manager !== null && ! in_array($manager->status, ['rejected', 'blocked'], true);

        if ($hasActiveManager && ! $team->is_free) {
            return response()->json([
                'message' => 'لا يمكن حذف فرق المسيرين المعتمدين لحماية بيانات حساب المسير.',
            ], 422);
        }

        DB::transaction(function () use ($team) {
            User::where('current_team_id', $team->id)->update(['current_team_id' => null]);
            $this->deleteTeamFiles($team);
            $teamId = $team->id;
            $team->forceDelete();
            TeamCache::flushTeam($teamId);
        });

        return response()->json([
            'message' => 'تم حذف الفريق بنجاح',
        ]);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct',
        ]);

        $teams = Team::with(['manager', 'currentManager'])->whereIn('id', $data['ids'])->get();

        $deletableTeams = $teams->filter(function ($t) {
            $m = $t->manager ?? $t->currentManager;
            $hasActiveManager = $m !== null && ! in_array($m->status, ['rejected', 'blocked'], true);
            return $t->is_free || ! $hasActiveManager;
        });
        $managerTeamsCount = $teams->count() - $deletableTeams->count();

        if ($deletableTeams->isEmpty()) {
            return response()->json([
                'message' => 'لم يتم تحديد أي فريق قابل للحذف. فرق المسيرين المعتمدين لا يمكن حذفها.',
            ], 422);
        }

        DB::transaction(function () use ($deletableTeams) {
            foreach ($deletableTeams as $team) {
                User::where('current_team_id', $team->id)->update(['current_team_id' => null]);
                $this->deleteTeamFiles($team);
                $teamId = $team->id;
                $team->forceDelete();
                TeamCache::flushTeam($teamId);
            }
        });

        $deletedCount = $deletableTeams->count();
        $message = "تم حذف {$deletedCount} فريق بنجاح";
        if ($managerTeamsCount > 0) {
            $message .= " (تم استثناء {$managerTeamsCount} من فرق المسيرين المعتمدين لحمايتها)";
        }

        return response()->json([
            'message' => $message,
            'deleted' => $deletedCount,
            'skipped' => $managerTeamsCount,
        ]);
    }

    private function deleteTeamFiles(Team $team): void
    {
        $paths = [
            $team->logo_path,
            $team->logo_thumbnail_path,
            $team->cover_image_path,
            $team->cover_thumbnail_path,
        ];

        foreach ($paths as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}
