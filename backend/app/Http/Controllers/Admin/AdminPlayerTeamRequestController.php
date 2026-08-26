<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Player\Models\PlayerTeamRequest;
use App\Domains\Player\Services\PlayerTeamRequestService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlayerTeamRequestController extends Controller
{
    public function __construct(
        private readonly PlayerTeamRequestService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = PlayerTeamRequest::with(['player', 'handler'])->latest();

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->whereHas('player', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));
        $paginator = $query->paginate($perPage)->withQueryString();

        $collection = $paginator->getCollection()->map(function ($item) {
            $item->player?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');
            $item->handler?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

            return $item;
        });

        return response()->json([
            'requests' => $collection,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $request = PlayerTeamRequest::with(['player', 'handler'])
            ->where('id', $id)
            ->firstOrFail();

        $request->player?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');
        $request->handler?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

        return response()->json(['request' => $request]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $teamRequest = PlayerTeamRequest::findOrFail($id);

        $data = $request->validate([
            'team_name' => 'nullable|string|max:255',
        ]);

        $updated = $this->service->approve(
            $teamRequest,
            $request->user(),
            $data['team_name'] ?? null,
        );

        $updated->player?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');
        $updated->handler?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

        return response()->json([
            'message' => 'تم قبول طلب الانضمام وإنشاء الفريق بنجاح.',
            'request' => $updated,
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $teamRequest = PlayerTeamRequest::findOrFail($id);

        $data = $request->validate([
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        $updated = $this->service->reject(
            $teamRequest,
            $request->user(),
            $data['rejection_reason'] ?? null,
        );

        $updated->player?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');
        $updated->handler?->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

        return response()->json([
            'message' => 'تم رفض طلب الانضمام.',
            'request' => $updated,
        ]);
    }
}
