<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Models\AccountRecovery;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AccountController extends Controller
{
    public function delete(Request $request, int $id): JsonResponse
    {
        $user = User::withoutGlobalScopes()->findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'لا يمكن حذف حساب مسؤول',
            ], 403);
        }

        $blockers = $user->canBeDeleted();
        if (! empty($blockers)) {
            return response()->json([
                'message' => 'لا يمكن حذف هذا الحساب',
                'blockers' => $blockers,
            ], 409);
        }

        DB::transaction(function () use ($user) {
            $user->revokeTokens();

            $user->name = 'محذوف';
            $user->email = null;
            $user->phone = 'deleted_'.$user->id;
            $user->password = 'deleted';
            $user->avatar_path = null;
            $user->avatar_thumbnail_path = null;
            $user->status = 'blocked';
            $user->save();

            $user->delete();
        });

        return response()->json([
            'message' => 'تم حذف الحساب بنجاح',
        ]);
    }

    public function generateRecovery(Request $request, int $id): JsonResponse
    {
        $user = User::withoutGlobalScopes()->findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'لا يمكن إنشاء رمز استرداد لحساب مسؤول',
            ], 403);
        }

        AccountRecovery::where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->update(['used_at' => now()]);

        $recovery = AccountRecovery::generateFor($user, $request->user());

        return response()->json([
            'message' => 'تم إنشاء رمز الاسترداد بنجاح',
            'recovery' => [
                'id' => $recovery->id,
                'token' => $recovery->token,
                'expires_at' => $recovery->expires_at->toISOString(),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'phone' => $user->phone,
                ],
            ],
        ]);
    }

    public function recoveries(Request $request, int $id): JsonResponse
    {
        $user = User::withoutGlobalScopes()->findOrFail($id);

        $recoveries = AccountRecovery::where('user_id', $user->id)
            ->with('admin:id,name')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (AccountRecovery $r) => [
                'id' => $r->id,
                'expires_at' => $r->expires_at->toISOString(),
                'used_at' => $r->used_at?->toISOString(),
                'is_expired' => $r->isExpired(),
                'is_used' => $r->isUsed(),
                'can_be_used' => $r->canBeUsed(),
                'admin_name' => $r->admin?->name,
            ]);

        return response()->json(['recoveries' => $recoveries]);
    }

    public function applyRecovery(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string|size:64',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $recovery = AccountRecovery::where('token', $data['token'])->first();

        if (! $recovery) {
            return response()->json([
                'message' => 'رمز الاسترداد غير صالح',
            ], 404);
        }

        if (! $recovery->canBeUsed()) {
            return response()->json([
                'message' => $recovery->isExpired()
                    ? 'انتهت صلاحية رمز الاسترداد'
                    : 'تم استخدام رمز الاسترداد بالفعل',
            ], 410);
        }

        $user = User::withoutGlobalScopes()->find($recovery->user_id);

        if (! $user) {
            return response()->json([
                'message' => 'الحساب غير موجود',
            ], 404);
        }

        DB::transaction(function () use ($user, $data, $recovery) {
            $user->password = $data['password'];
            $user->status = 'approved';
            $user->save();

            $recovery->markUsed();

            $user->revokeTokens();
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'تم استرداد الحساب بنجاح. يرجى تغيير كلمة المرور.',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status'),
            'token' => $token,
        ]);
    }

    public function lockActivity(Request $request, int $id): JsonResponse
    {
        $user = User::withoutGlobalScopes()->findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'لا يمكن تقييد نشاط مسؤول',
            ], 403);
        }

        if ($user->isActivityLocked()) {
            return response()->json([
                'message' => 'الحساب مقيد بالفعل',
            ], 409);
        }

        $data = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $user->lockActivity($data['reason'], $request->user()->id);

        return response()->json([
            'message' => 'تم تقييد نشاط الحساب بنجاح',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'activity_locked' => true,
                'activity_lock_reason' => $user->activity_lock_reason,
                'activity_locked_at' => $user->activity_locked_at->toISOString(),
            ],
        ]);
    }

    public function unlockActivity(int $id): JsonResponse
    {
        $user = User::withoutGlobalScopes()->findOrFail($id);

        if (! $user->isActivityLocked()) {
            return response()->json([
                'message' => 'الحساب غير مقيد',
            ], 409);
        }

        $user->unlockActivity();

        return response()->json([
            'message' => 'تم رفع تقييد النشاط بنجاح',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'activity_locked' => false,
            ],
        ]);
    }
}
