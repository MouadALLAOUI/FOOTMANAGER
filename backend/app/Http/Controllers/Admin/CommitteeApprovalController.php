<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Notification\Jobs\NotifyUserApprovalUpdatePush;
use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeApprovalController extends Controller
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

        $query = User::with('activeSubscription.plan:id,name,slug,is_free')
            ->where('role', 'committee')
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

        return response()->json([
            'committees' => $paginator->getCollection()->map(
                fn ($user) => $user->makeVisible(['phone', 'email', 'is_whatsapp'])->append('plan_name'),
            ),
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

        $count = User::where('role', 'committee')
            ->whereIn('id', $data['ids'])
            ->update(['status' => self::ACTIONS[$data['action']]]);

        if (in_array($data['action'], ['reject', 'block'], true)) {
            User::where('role', 'committee')
                ->whereIn('id', $data['ids'])
                ->get()
                ->each(fn (User $user) => $user->revokeTokens());
        }

        $newStatus = self::ACTIONS[$data['action']];
        foreach ($data['ids'] as $userId) {
            NotifyUserApprovalUpdatePush::dispatch((int) $userId, $newStatus);
        }

        return response()->json([
            'message' => "تم تحديث {$count} حساب لجنة منظمة.",
            'updated' => $count,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $committee = User::with('activeSubscription.plan')
            ->where('role', 'committee')
            ->where('id', $id)
            ->firstOrFail();

        $committee->makeVisible(['phone', 'email', 'is_whatsapp'])->append('plan_name');

        return response()->json(['committee' => $committee]);
    }

    public function approve(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'committee')->firstOrFail();
        $user->update(['status' => 'approved']);
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'approved');

        return response()->json([
            'message' => 'تم قبول حساب اللجنة المنظمة وتفعيله بنجاح',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function reject(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'committee')->firstOrFail();
        $user->update(['status' => 'rejected']);
        $user->revokeTokens();
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'rejected');

        return response()->json([
            'message' => 'تم رفض طلب اللجنة المنظمة',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function block(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'committee')->firstOrFail();
        $user->update(['status' => 'blocked']);
        $user->revokeTokens();
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'blocked');

        return response()->json([
            'message' => 'تم حظر حساب اللجنة المنظمة',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function unblock(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'committee')->firstOrFail();
        $user->update(['status' => 'approved']);
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'unblocked');

        return response()->json([
            'message' => 'تم إلغاء الحظر وإعادة تفعيل حساب اللجنة المنظمة',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }
}
