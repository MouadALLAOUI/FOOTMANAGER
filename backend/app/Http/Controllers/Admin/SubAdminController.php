<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Services\ActivityService;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class SubAdminController extends Controller
{
    public function __construct(
        protected ActivityService $activityService,
    ) {}
    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('group')->orderBy('slug')->get();

        return response()->json(['permissions' => $permissions]);
    }

    public function index(): JsonResponse
    {
        $subAdmins = User::where('role', 'sub_admin')
            ->with('permissions:slug,name,group')
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'status' => $u->status,
                'created_at' => $u->created_at,
                'permissions' => $u->getPermissionSlugs(),
            ]);

        return response()->json(['sub_admins' => $subAdmins]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'phone' => 'required|string|unique:users,phone|max:20',
            'password' => 'required|string|min:8',
            'permissions' => 'required|array|min:1',
            'permissions.*' => 'string|exists:permissions,slug',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'],
            'password' => $data['password'],
            'role' => 'sub_admin',
            'status' => 'approved',
        ]);

        $permissionIds = Permission::whereIn('slug', $data['permissions'])->pluck('id');
        $user->permissions()->sync($permissionIds);

        $user->load('permissions:slug,name,group');

        $this->activityService->record(
            Activity::TYPE_SUB_ADMIN_CREATED,
            $request->user(),
            $user,
            ['permissions' => $data['permissions']],
        );

        return response()->json([
            'message' => 'تم إنشاء حساب المسؤول الفرعي بنجاح',
            'sub_admin' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'permissions' => $user->getPermissionSlugs(),
            ],
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::where('role', 'sub_admin')->findOrFail($id);
        $user->load('permissions:slug,name,group');

        return response()->json([
            'sub_admin' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'permissions' => $user->getPermissionSlugs(),
            ],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', 'sub_admin')->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
        ]);

        $user->update($data);

        $this->activityService->record(
            Activity::TYPE_SUB_ADMIN_UPDATED,
            $request->user(),
            $user,
            ['fields' => array_keys($data)],
        );

        return response()->json([
            'message' => 'تم تحديث بيانات المسؤول الفرعي بنجاح',
            'sub_admin' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
            ],
        ]);
    }

    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', 'sub_admin')->findOrFail($id);

        $data = $request->validate([
            'permissions' => 'required|array|min:1',
            'permissions.*' => 'string|exists:permissions,slug',
        ]);

        $oldPermissions = $user->getPermissionSlugs();

        $permissionIds = Permission::whereIn('slug', $data['permissions'])->pluck('id');
        $user->permissions()->sync($permissionIds);

        $user->revokeTokens();

        $this->activityService->record(
            Activity::TYPE_SUB_ADMIN_PERMISSIONS_CHANGED,
            $request->user(),
            $user,
            ['old' => $oldPermissions, 'new' => $data['permissions']],
        );

        return response()->json([
            'message' => 'تم تحديث الصلاحيات بنجاح. سيتعين على المسؤول الفرعي إعادة تسجيل الدخول.',
            'permissions' => $user->fresh()->getPermissionSlugs(),
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', 'sub_admin')->findOrFail($id);

        $data = $request->validate([
            'status' => 'required|in:approved,blocked',
        ]);

        $user->update(['status' => $data['status']]);

        if ($data['status'] === 'blocked') {
            $user->revokeTokens();
        }

        $activityType = $data['status'] === 'blocked'
            ? Activity::TYPE_SUB_ADMIN_BLOCKED
            : Activity::TYPE_SUB_ADMIN_ACTIVATED;

        $this->activityService->record(
            $activityType,
            $request->user(),
            $user,
        );

        return response()->json([
            'message' => $data['status'] === 'blocked' ? 'تم حظر المسؤول الفرعي' : 'تم تفعيل المسؤول الفرعي',
            'status' => $user->status,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', 'sub_admin')->findOrFail($id);

        $userName = $user->name;

        DB::transaction(function () use ($user) {
            $user->permissions()->detach();
            $user->revokeTokens();
            $user->delete();
        });

        $this->activityService->record(
            Activity::TYPE_SUB_ADMIN_REMOVED,
            $request->user(),
            null,
            ['sub_admin_name' => $userName, 'sub_admin_id' => $id],
        );

        return response()->json([
            'message' => 'تم حذف حساب المسؤول الفرعي بنجاح',
        ]);
    }
}
