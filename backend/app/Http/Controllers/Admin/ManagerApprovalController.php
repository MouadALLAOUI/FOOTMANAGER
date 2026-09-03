<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Notification\Jobs\NotifyUserApprovalUpdatePush;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Models\Comment;
use App\Domains\Social\Models\Report;
use App\Domains\Stadium\Models\Facility;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerApprovalController extends Controller
{
    public const ACTIONS = [
        'approve' => 'approved',
        'reject' => 'rejected',
        'block' => 'blocked',
        'unblock' => 'approved',
    ];

    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = User::with(['team', 'activeSubscription.plan:id,name,slug,is_free'])
            ->where('role', 'manager')
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
            'managers' => $collection,
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

        $count = User::where('role', 'manager')
            ->whereIn('id', $data['ids'])
            ->update(['status' => self::ACTIONS[$data['action']]]);

        if (in_array($data['action'], ['reject', 'block'], true)) {
            User::where('role', 'manager')
                ->whereIn('id', $data['ids'])
                ->get()
                ->each(fn (User $user) => $user->revokeTokens());
        }

        $newStatus = self::ACTIONS[$data['action']];
        foreach ($data['ids'] as $userId) {
            NotifyUserApprovalUpdatePush::dispatch((int) $userId, $newStatus);
        }

        return response()->json([
            'message' => "تم تحديث {$count} حساب مسير.",
            'updated' => $count,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $manager = User::with(['team', 'activeSubscription.plan'])
            ->where('role', 'manager')
            ->where('id', $id)
            ->firstOrFail()
            ->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

        $manager->append('plan_name');

        return response()->json(['manager' => $manager]);
    }

    public function approve(int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('role', 'manager')
            ->firstOrFail();

        $user->update(['status' => 'approved']);
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'approved');

        return response()->json([
            'message' => 'تم قبول حساب المسير وتفعيل حسابه بنجاح',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('role', 'manager')
            ->firstOrFail();

        $user->update(['status' => 'rejected']);
        $user->revokeTokens();
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'rejected');

        return response()->json([
            'message' => 'تم رفض طلب الانضمام',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function block(int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('role', 'manager')
            ->firstOrFail();

        $user->update(['status' => 'blocked']);
        $user->revokeTokens();
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'blocked');

        return response()->json([
            'message' => 'تم حظر الحساب بنجاح',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function unblock(int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('role', 'manager')
            ->firstOrFail();

        $user->update(['status' => 'approved']);
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'unblocked');

        return response()->json([
            'message' => 'تم إلغاء الحظر وإعادة تفعيل الحساب',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function stats(): JsonResponse
    {
        $hideable = [
            Comment::class,
            MatchChatMessage::class,
            PlayerReview::class,
            StadiumReview::class,
        ];

        $hiddenTotal = 0;
        foreach ($hideable as $class) {
            $hiddenTotal += $class::where('status', 'hidden')->count();
        }

        $stats = [
            'total' => User::where('role', 'manager')->count(),
            'pending' => User::where('role', 'manager')->where('status', 'pending')->count(),
            'approved' => User::where('role', 'manager')->where('status', 'approved')->count(),
            'rejected' => User::where('role', 'manager')->where('status', 'rejected')->count(),
            'blocked' => User::where('role', 'manager')->where('status', 'blocked')->count(),
            'terrain_owners_total' => User::where('role', 'terrain_owner')->count(),
            'terrain_owners_pending' => User::where('role', 'terrain_owner')->where('status', 'pending')->count(),
            'terrain_owners_approved' => User::where('role', 'terrain_owner')->where('status', 'approved')->count(),
            'terrain_owners_rejected' => User::where('role', 'terrain_owner')->where('status', 'rejected')->count(),
            'terrain_owners_blocked' => User::where('role', 'terrain_owner')->where('status', 'blocked')->count(),
            'players_total' => User::where('role', 'player')->count(),
            'players_pending' => User::where('role', 'player')->where('status', 'pending')->count(),
            'players_approved' => User::where('role', 'player')->where('status', 'approved')->count(),
            'players_rejected' => User::where('role', 'player')->where('status', 'rejected')->count(),
            'players_blocked' => User::where('role', 'player')->where('status', 'blocked')->count(),
            'committees_total' => User::where('role', 'committee')->count(),
            'committees_pending' => User::where('role', 'committee')->where('status', 'pending')->count(),
            'committees_approved' => User::where('role', 'committee')->where('status', 'approved')->count(),
            'committees_rejected' => User::where('role', 'committee')->where('status', 'rejected')->count(),
            'committees_blocked' => User::where('role', 'committee')->where('status', 'blocked')->count(),
            'facilities_total' => Facility::count(),
            'reports_pending' => Report::where('status', Report::STATUS_PENDING)->count(),
            'hidden_total' => $hiddenTotal,
        ];

        return response()->json(['stats' => $stats]);
    }

    public function terrainOwners(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = User::with(['terrains', 'activeSubscription.plan:id,name,slug,is_free'])
            ->where('role', 'terrain_owner')
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
            'owners' => $collection,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function bulkTerrainOwners(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct',
            'action' => 'required|in:approve,reject,block,unblock',
        ]);

        $count = User::where('role', 'terrain_owner')
            ->whereIn('id', $data['ids'])
            ->update(['status' => self::ACTIONS[$data['action']]]);

        if (in_array($data['action'], ['reject', 'block'], true)) {
            User::where('role', 'terrain_owner')
                ->whereIn('id', $data['ids'])
                ->get()
                ->each(fn (User $user) => $user->revokeTokens());
        }

        $newStatus = self::ACTIONS[$data['action']];
        foreach ($data['ids'] as $userId) {
            NotifyUserApprovalUpdatePush::dispatch((int) $userId, $newStatus);
        }

        return response()->json([
            'message' => "تم تحديث {$count} حساب صاحب تيران.",
            'updated' => $count,
        ]);
    }

    public function showTerrainOwner(int $id): JsonResponse
    {
        $owner = User::with(['terrains.images', 'activeSubscription.plan'])
            ->where('role', 'terrain_owner')
            ->where('id', $id)
            ->firstOrFail()
            ->makeVisible('phone', 'email', 'is_whatsapp', 'avatar_path', 'avatar_thumbnail_path', 'email_verified_at', 'activity_lock_reason', 'activity_locked_by', 'activity_locked_at');

        $owner->append('plan_name');

        return response()->json(['owner' => $owner]);
    }

    public function approveTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'approved']);
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'approved');

        return response()->json([
            'message' => 'تم قبول حساب صاحب التيران وتفعيل حسابه بنجاح',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function rejectTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'rejected']);
        $user->revokeTokens();
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'rejected');

        return response()->json([
            'message' => 'تم رفض طلب صاحب التيران',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function blockTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'blocked']);
        $user->revokeTokens();
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'blocked');

        return response()->json([
            'message' => 'تم حظر حساب صاحب التيران',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function unblockTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'approved']);
        NotifyUserApprovalUpdatePush::dispatch($user->id, 'unblocked');

        return response()->json([
            'message' => 'تم إلغاء الحظر وإعادة تفعيل حساب صاحب التيران',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }
}
