<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerApprovalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = User::with('team')
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

        $managers = $query->get(['id', 'name', 'email', 'phone', 'is_whatsapp', 'status', 'created_at']);

        return response()->json(['managers' => $managers]);
    }

    public function show(int $id): JsonResponse
    {
        $manager = User::with('team')
            ->where('role', 'manager')
            ->where('id', $id)
            ->firstOrFail();

        return response()->json(['manager' => $manager]);
    }

    public function approve(int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('role', 'manager')
            ->firstOrFail();

        $user->update(['status' => 'approved']);

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

        return response()->json([
            'message' => 'تم إلغاء الحظر وإعادة تفعيل الحساب',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function stats(): JsonResponse
    {
        $stats = [
            'total' => User::where('role', 'manager')->count(),
            'pending' => User::where('role', 'manager')->where('status', 'pending')->count(),
            'approved' => User::where('role', 'manager')->where('status', 'approved')->count(),
            'rejected' => User::where('role', 'manager')->where('status', 'rejected')->count(),
            'blocked' => User::where('role', 'manager')->where('status', 'blocked')->count(),
            'terrain_owners_total' => User::where('role', 'terrain_owner')->count(),
            'terrain_owners_pending' => User::where('role', 'terrain_owner')->where('status', 'pending')->count(),
            'terrain_owners_approved' => User::where('role', 'terrain_owner')->where('status', 'approved')->count(),
        ];

        return response()->json(['stats' => $stats]);
    }

    public function terrainOwners(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = User::with('terrains')
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

        $owners = $query->get(['id', 'name', 'email', 'phone', 'is_whatsapp', 'status', 'created_at']);

        return response()->json(['owners' => $owners]);
    }

    public function showTerrainOwner(int $id): JsonResponse
    {
        $owner = User::with('terrains.images')
            ->where('role', 'terrain_owner')
            ->where('id', $id)
            ->firstOrFail();

        return response()->json(['owner' => $owner]);
    }

    public function approveTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'approved']);

        return response()->json([
            'message' => 'تم قبول حساب صاحب التيران وتفعيل حسابه بنجاح',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function rejectTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'rejected']);

        return response()->json([
            'message' => 'تم رفض طلب صاحب التيران',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function blockTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'blocked']);

        return response()->json([
            'message' => 'تم حظر حساب صاحب التيران',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }

    public function unblockTerrainOwner(int $id): JsonResponse
    {
        $user = User::where('id', $id)->where('role', 'terrain_owner')->firstOrFail();
        $user->update(['status' => 'approved']);

        return response()->json([
            'message' => 'تم إلغاء الحظر وإعادة تفعيل حساب صاحب التيران',
            'user' => $user->only('id', 'name', 'status'),
        ]);
    }
}
