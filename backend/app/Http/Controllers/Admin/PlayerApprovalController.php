<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerApprovalController extends Controller
{
    public const ACTIONS = [
        'approve' => 'approved',
        'reject' => 'rejected',
        'block' => 'blocked',
        'unblock' => 'approved',
    ];

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = User::with(['playerProfile', 'activeSubscription.plan:id,name,slug,is_free'])
            ->where('role', 'player')
            ->latest();

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));
        $paginator = $query->paginate($perPage)->withQueryString();

        $collection = $paginator->getCollection()->map(
            fn ($user) => $user->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at')
                ->append('plan_name'),
        );

        return response()->json([
            'players' => $collection,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct',
            'action' => 'required|in:approve,reject,block,unblock',
        ]);

        $count = User::where('role', 'player')
            ->whereIn('id', $data['ids'])
            ->update(['status' => self::ACTIONS[$data['action']]]);

        if (in_array($data['action'], ['reject', 'block'], true)) {
            User::where('role', 'player')
                ->whereIn('id', $data['ids'])
                ->get()
                ->each(fn (User $user) => $user->revokeTokens());
        }

        return response()->json([
            'message' => "تم تحديث {$count} حساب لاعب.",
            'updated' => $count,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $player = User::with(['playerProfile', 'activeSubscription.plan'])
            ->where('role', 'player')
            ->where('id', $id)
            ->firstOrFail()
            ->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

        $player->append('plan_name');

        return response()->json(['player' => $player]);
    }

    public function approve(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'player')->firstOrFail();
        $user->update(['status' => 'approved']);

        return response()->json([
            'message' => 'تم قبول حساب اللاعب وتفعيل حسابه بنجاح',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function reject(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'player')->firstOrFail();
        $user->update(['status' => 'rejected']);
        $user->revokeTokens();

        return response()->json([
            'message' => 'تم رفض طلب اللاعب',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function block(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'player')->firstOrFail();
        $user->update(['status' => 'blocked']);
        $user->revokeTokens();

        return response()->json([
            'message' => 'تم حظر حساب اللاعب',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function unblock(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'player')->firstOrFail();
        $user->update(['status' => 'approved']);

        return response()->json([
            'message' => 'تم إلغاء الحظر وإعادة تفعيل حساب اللاعب',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }
}
