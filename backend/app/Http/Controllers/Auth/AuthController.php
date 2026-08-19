<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Services\ImageThumbnailService;
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
use App\Models\Setting;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        if (! Setting::get('registration_open', true)) {
            return response()->json(['message' => 'التسجيل مغلق حالياً'], 403);
        }

        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'],
                'is_whatsapp' => $data['is_whatsapp'] ?? false,
                'password' => $data['password'],
                'role' => 'manager',
                'status' => 'pending',
            ]);

            Team::create([
                'name' => $data['team_name'],
                'member_count' => $data['member_count'],
                'category' => $data['team_category'],
                'association_name' => $data['association_name'] ?? null,
                'manager_id' => $user->id,
                'visibility' => 'private',
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
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'avatar_url', 'avatar_thumbnail_url'),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $login = $request->login;

        $user = User::where('phone', $login)
            ->orWhere('email', $login)
            ->first();

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

        return response()->json([
            'user' => $this->userPayload($user),
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
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|nullable|email|max:255|unique:users,email,'.$user->id,
            'phone' => 'sometimes|string|max:20|unique:users,phone,'.$user->id,
            'is_whatsapp' => 'sometimes|boolean',
            'password' => 'sometimes|string|min:8|confirmed',
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        $fresh = $this->userPayload($user->fresh());

        return response()->json([
            'message' => 'تم تحديث الملف الشخصي بنجاح.',
            'user' => $fresh,
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'avatar' => [
                'required',
                'image',
                'mimes:jpeg,png,jpg,webp',
                'max:4096',
                'dimensions:min_width=64,min_height=64,max_width=5000,max_height=5000',
            ],
        ]);

        $file = $validated['avatar'];

        $stored = app(ImageThumbnailService::class)->storeWithThumbnail($file, 'avatars');

        $this->deleteAvatarFiles($user);

        $user->update([
            'avatar_path' => $stored['path'],
            'avatar_thumbnail_path' => $stored['thumbnail_path'],
        ]);

        return response()->json([
            'message' => 'تم تحديث الصورة الشخصية بنجاح',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->deleteAvatarFiles($user);

        $user->update([
            'avatar_path' => null,
            'avatar_thumbnail_path' => null,
        ]);

        return response()->json([
            'message' => 'تمت إزالة الصورة الشخصية',
            'user' => $this->userPayload($user->fresh()),
        ]);
    }

    private function deleteAvatarFiles(User $user): void
    {
        foreach ([$user->avatar_path, $user->avatar_thumbnail_path] as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    private function userPayload(User $user): array
    {
        $data = $user->only(
            'id',
            'name',
            'email',
            'phone',
            'role',
            'status',
            'is_whatsapp',
            'avatar_url',
            'avatar_thumbnail_url',
            'activity_locked',
            'activity_lock_reason',
            'activity_locked_at'
        );

        if ($user->role === 'sub_admin') {
            $data['permissions'] = $user->getPermissionSlugs();
        }

        if ($user->role === 'manager') {
            $user->loadMissing('team');
            $data['team'] = $user->team;
        } elseif ($user->role === 'terrain_owner') {
            $user->loadMissing('terrains');
            $data['terrains'] = $user->terrains;
        } elseif ($user->role === 'player') {
            $user->loadMissing('playerProfile');
            $data['player_profile'] = $user->playerProfile;
        }

        return $data;
    }

    public function registerPlayer(RegisterPlayerRequest $request): JsonResponse
    {
        if (! Setting::get('registration_open', true)) {
            return response()->json(['message' => 'التسجيل مغلق حالياً'], 403);
        }

        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'is_whatsapp' => $validated['is_whatsapp'] ?? false,
            'password' => $validated['password'],
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
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'avatar_url', 'avatar_thumbnail_url'),
        ], 201);
    }

    public function registerTerrainOwner(Request $request): JsonResponse
    {
        if (! Setting::get('registration_open', true)) {
            return response()->json(['message' => 'التسجيل مغلق حالياً'], 403);
        }

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
            'password' => $validated['password'],
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
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'avatar_url', 'avatar_thumbnail_url'),
        ], 201);
    }

    public function registerCommittee(Request $request): JsonResponse
    {
        if (! Setting::get('registration_open', true)) {
            return response()->json(['message' => 'التسجيل مغلق حالياً'], 403);
        }

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
            'password' => $validated['password'],
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
            'user' => $user->only('id', 'name', 'email', 'phone', 'role', 'status', 'avatar_url', 'avatar_thumbnail_url'),
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
                    approvalUrl: rtrim(config('cors.allowed_origins.0'), '/').$approvalPath,
                ));
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
