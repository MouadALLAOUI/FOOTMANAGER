<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use App\Http\Requests\RegisterPlayerRequest;
use App\Http\Requests\RegisterRequest;
use App\Mail\NewRegistrationMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

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
                'role' => 'manager',
                'status' => 'pending',
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

        $this->notifyAdminOfNewRegistration([
            'type' => 'manager',
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'team_name' => $data['team_name'],
            'team_category' => $data['team_category'],
        ]);

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

        if (! $user || ! Hash::check($request->password, $user->password)) {
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

        if ($user->status === 'blocked') {
            return response()->json([
                'message' => 'تم حظر حسابك من قبل الإدارة',
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
        } elseif ($user->role === 'player') {
            $user->load('playerProfile');
            $data['player_profile'] = $user->playerProfile;
        }

        return response()->json(['user' => $data]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,'.$user->id,
            'phone' => 'sometimes|string|max:20|unique:users,phone,'.$user->id,
            'is_whatsapp' => 'sometimes|boolean',
            'password' => 'sometimes|string|min:8|confirmed',
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        $fresh = $user->fresh()->only('id', 'name', 'email', 'phone', 'is_whatsapp', 'role', 'status');

        return response()->json([
            'message' => 'تم تحديث الملف الشخصي بنجاح.',
            'user' => $fresh,
        ]);
    }

    public function registerPlayer(RegisterPlayerRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'is_whatsapp' => $validated['is_whatsapp'] ?? false,
            'password' => Hash::make($validated['password']),
            'role' => 'player',
            'status' => 'pending',
        ]);

        PlayerProfile::create([
            'user_id' => $user->id,
            'position' => $validated['position'] ?? null,
            'skill_level' => $validated['skill_level'] ?? null,
            'birth_year' => $validated['birth_year'] ?? null,
            'city' => $validated['city'] ?? null,
        ]);

        $this->notifyAdminOfNewRegistration([
            'type' => 'player',
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
        ]);

        return response()->json([
            'message' => 'تم تسجيل طلب حساب اللاعب بنجاح، بانتظار موافقة الإدارة',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status'),
        ], 201);
    }

    public function registerTerrainOwner(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|unique:users,phone|max:20',
            'is_whatsapp' => 'boolean',
            'password' => 'required|string|min:8',
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

        $this->notifyAdminOfNewRegistration([
            'type' => 'terrain_owner',
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
        ]);

        return response()->json([
            'message' => 'تم تسجيل طلب حساب صاحب التيران بنجاح، بانتظار موافقة الإدارة',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status'),
        ], 201);
    }

    public function registerCommittee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|unique:users,phone|max:20',
            'is_whatsapp' => 'boolean',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'is_whatsapp' => $validated['is_whatsapp'] ?? false,
            'password' => Hash::make($validated['password']),
            'role' => 'committee',
            'status' => 'pending',
        ]);

        $this->notifyAdminOfNewRegistration([
            'type' => 'committee',
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
        ]);

        return response()->json([
            'message' => 'تم تسجيل طلب حساب اللجنة المنظمة بنجاح، بانتظار موافقة الإدارة',
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status'),
        ], 201);
    }

    private function notifyAdminOfNewRegistration(array $data): void
    {
        try {
            $recipients = User::where('role', 'admin')->pluck('email')->filter();
            $adminEmail = config('mail.admin_email');

            if ($recipients->isEmpty() && $adminEmail) {
                $recipients = collect([$adminEmail]);
            }

            if ($recipients->isEmpty()) {
                return;
            }

            $approvalPath = match ($data['type']) {
                'terrain_owner' => '/admin/terrain-owners',
                'player' => '/admin/players',
                'committee' => '/admin/committees',
                default => '/admin/managers',
            };

            Mail::to($recipients->all())
                ->send(new NewRegistrationMail(
                    type: $data['type'],
                    name: $data['name'],
                    phone: $data['phone'],
                    email: $data['email'] ?? null,
                    teamName: $data['team_name'] ?? null,
                    teamCategory: $data['team_category'] ?? null,
                    approvalUrl: rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/').$approvalPath,
                ));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
