<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\Stadium;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'],
                'is_whatsapp' => $data['is_whatsapp'] ?? false,
                'password' => Hash::make($data['password']),
            ]);

            Team::create([
                'name' => $data['team_name'],
                'member_count' => $data['member_count'],
                'category' => $data['team_category'],
                'association_name' => $data['association_name'] ?? null,
                'manager_id' => $user->id,
            ]);

            return $user;
        });

        return response()->json([
            'message' => 'تم تسجيل طلب الانضمام بنجاح، بانتظار موافقة الإدارة',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status'),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $login = $request->login;
        $isEmail = filter_var($login, FILTER_VALIDATE_EMAIL);

        $query = User::query();
        if ($isEmail) {
            $query->where('email', $login);
        } else {
            $query->where('phone', $login);
        }

        $user = $query->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'بيانات الدخول غير صحيحة',
            ], 401);
        }

        if ($user->status === 'pending') {
            return response()->json([
                'message' => 'حسابك قيد المراجعة من قبل الإدارة',
            ], 403);
        }

        if ($user->status === 'rejected') {
            return response()->json([
                'message' => 'تم رفض طلب الانضمام الخاص بك',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        $user->load('team');

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'is_whatsapp'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'تم تسجيل الخروج بنجاح',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'is_whatsapp');

        if ($user->role === 'manager') {
            $user->load('team');
            $data['team'] = $user->team;
        } elseif ($user->role === 'terrain_owner') {
            $user->load('terrains');
            $data['terrains'] = $user->terrains;
        }

        return response()->json(['user' => $data]);
    }

    public function registerTerrainOwner(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|unique:users,phone|max:20',
            'is_whatsapp' => 'boolean',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'is_whatsapp' => $validated['is_whatsapp'] ?? false,
            'password' => Hash::make($validated['password']),
            'role' => 'terrain_owner',
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'تم تسجيل طلب حساب صاحب التيران بنجاح، بانتظار موافقة الإدارة',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status'),
        ], 201);
    }
}
