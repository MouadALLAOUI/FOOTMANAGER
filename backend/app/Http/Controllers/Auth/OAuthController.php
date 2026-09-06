<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Base\Controller;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Domains\Team\Models\Team;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    private const ALLOWED_PROVIDERS = ['google', 'facebook'];

    public function __construct(
        private readonly SubscriptionService $subscriptionService,
    ) {}

    /**
     * Redirect the user to the OAuth provider's authentication page.
     */
    public function redirect(Request $request, string $provider): JsonResponse|RedirectResponse
    {
        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            return response()->json(['message' => 'مزود تسجيل الدخول غير مدعوم'], 400);
        }

        $role = $request->query('role', 'player');
        if (! in_array($role, ['player', 'manager'], true)) {
            $role = 'player';
        }

        $stateData = [
            'role' => $role,
            'device_id' => $request->query('device_id') ?: (string) Str::uuid(),
        ];

        $driver = Socialite::driver($provider)->stateless();

        if ($provider === 'google') {
            $driver->scopes(['openid', 'profile', 'email']);
        }

        $redirectUrl = $driver->with([
            'state' => base64_encode(json_encode($stateData)),
        ])->redirect()->getTargetUrl();

        if ($request->wantsJson() || $request->query('json') === '1') {
            return response()->json(['url' => $redirectUrl]);
        }

        return redirect()->away($redirectUrl);
    }

    /**
     * Handle the OAuth provider callback and authenticate the user.
     */
    public function callback(Request $request, string $provider): RedirectResponse
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/');

        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            return redirect()->away($frontendUrl . '/login?error=' . urlencode('مزود الخدمة غير مدعوم'));
        }

        if ($request->has('error') || ! $request->has('code')) {
            $errorDesc = $request->input('error_description') ?? $request->input('error') ?? 'تم إلغاء عملية تسجيل الدخول';
            return redirect()->away($frontendUrl . '/login?error=' . urlencode($errorDesc));
        }

        $state = [];
        if ($request->filled('state')) {
            try {
                $decoded = json_decode(base64_decode($request->state), true);
                if (is_array($decoded)) {
                    $state = $decoded;
                }
            } catch (\Throwable) {
                // Ignore invalid state
            }
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            Log::error("OAuth [{$provider}] callback failure", ['exception' => $e->getMessage()]);
            return redirect()->away($frontendUrl . '/login?error=' . urlencode('فشل تسجيل الدخول عبر ' . ucfirst($provider) . '. يرجى المحاولة مرة أخرى.'));
        }

        $providerId = $socialUser->getId();
        $email = $socialUser->getEmail();
        $name = $socialUser->getName() ?: 'مستخدم';
        $idColumn = $provider . '_id';

        // 1. Search for existing user with this provider ID
        $user = User::where($idColumn, $providerId)->first();

        // 2. If not found by provider ID, match by verified email
        if (! $user && $email) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([$idColumn => $providerId]);
            }
        }

        // 3. If still not found, register new user
        if (! $user) {
            if (! Setting::get('registration_open', true)) {
                return redirect()->away($frontendUrl . '/login?error=' . urlencode('التسجيل مغلق حالياً'));
            }

            $role = $state['role'] ?? 'player';
            $status = $role === 'manager' ? 'pending' : 'approved';

            $user = DB::transaction(function () use ($name, $email, $idColumn, $providerId, $role, $status) {
                $newUser = User::create([
                    'name' => $name,
                    'email' => $email,
                    'phone' => null,
                    'is_whatsapp' => false,
                    $idColumn => $providerId,
                    'role' => $role,
                    'status' => $status,
                    'email_verified_at' => now(),
                ]);

                if ($role === 'player') {
                    PlayerProfile::create([
                        'user_id' => $newUser->id,
                        'position' => 'midfielder',
                        'city' => null,
                    ]);
                } elseif ($role === 'manager') {
                    Team::create([
                        'name' => 'فريق ' . $name,
                        'manager_id' => $newUser->id,
                        'visibility' => 'private',
                        'category' => 'adult',
                    ]);
                }

                return $newUser;
            });
        }

        // Check account approval status
        if ($user->status === 'blocked') {
            return redirect()->away($frontendUrl . '/login?error=' . urlencode('تم حظر حسابك من قبل الإدارة'));
        }

        if ($user->status === 'rejected') {
            return redirect()->away($frontendUrl . '/login?error=' . urlencode('تم رفض طلب تسجيلك من قبل الإدارة'));
        }

        if ($user->status === 'pending') {
            return redirect()->away($frontendUrl . '/login?error=' . urlencode('حسابك قيد المراجعة من قبل الإدارة'));
        }

        // Generate Sanctum token
        $deviceId = $state['device_id'] ?? (string) Str::uuid();
        $expiration = config('sanctum.expiration');
        $expiresAt = $expiration ? now()->addMinutes((int) $expiration) : null;
        $token = $user->createToken('oauth_' . $provider . '_' . Str::limit($deviceId, 80, ''), ['*'], $expiresAt)->plainTextToken;

        // Redirect to Frontend OAuth Callback Route
        $callbackTarget = $frontendUrl . '/auth/callback?' . http_build_query([
            'token' => $token,
            'provider' => $provider,
            'role' => $user->role,
        ]);

        return redirect()->away($callbackTarget);
    }

    /**
     * Direct API token exchange for mobile or popup clients.
     */
    public function tokenExchange(Request $request, string $provider): JsonResponse
    {
        if (! in_array($provider, self::ALLOWED_PROVIDERS, true)) {
            return response()->json(['message' => 'مزود تسجيل الدخول غير مدعوم'], 400);
        }

        $validated = $request->validate([
            'access_token' => 'required|string',
            'role' => 'sometimes|in:player,manager',
            'device_id' => 'sometimes|nullable|string|max:100',
        ]);

        try {
            $socialUser = Socialite::driver($provider)->stateless()->userFromToken($validated['access_token']);
        } catch (\Throwable $e) {
            Log::error("OAuth [{$provider}] token exchange failure", ['exception' => $e->getMessage()]);
            return response()->json(['message' => 'رمز التحقق غير صالح من ' . ucfirst($provider)], 401);
        }

        $providerId = $socialUser->getId();
        $email = $socialUser->getEmail();
        $name = $socialUser->getName() ?: 'مستخدم';
        $idColumn = $provider . '_id';

        $user = User::where($idColumn, $providerId)->first();

        if (! $user && $email) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([$idColumn => $providerId]);
            }
        }

        if (! $user) {
            if (! Setting::get('registration_open', true)) {
                return response()->json(['message' => 'التسجيل مغلق حالياً'], 403);
            }

            $role = $validated['role'] ?? 'player';
            $status = $role === 'manager' ? 'pending' : 'approved';

            $user = DB::transaction(function () use ($name, $email, $idColumn, $providerId, $role, $status) {
                $newUser = User::create([
                    'name' => $name,
                    'email' => $email,
                    $idColumn => $providerId,
                    'role' => $role,
                    'status' => $status,
                    'email_verified_at' => now(),
                ]);

                if ($role === 'player') {
                    PlayerProfile::create([
                        'user_id' => $newUser->id,
                        'position' => 'midfielder',
                    ]);
                } elseif ($role === 'manager') {
                    Team::create([
                        'name' => 'فريق ' . $name,
                        'manager_id' => $newUser->id,
                        'visibility' => 'private',
                    ]);
                }

                return $newUser;
            });
        }

        if ($user->status === 'blocked') {
            return response()->json(['message' => 'تم حظر حسابك من قبل الإدارة'], 403);
        }

        if ($user->status === 'rejected') {
            return response()->json(['message' => 'تم رفض طلب الانضمام الخاص بك'], 403);
        }

        if ($user->status === 'pending') {
            return response()->json(['message' => 'حسابك قيد المراجعة من قبل الإدارة'], 403);
        }

        $deviceId = $validated['device_id'] ?? (string) Str::uuid();
        $expiration = config('sanctum.expiration');
        $expiresAt = $expiration ? now()->addMinutes((int) $expiration) : null;
        $token = $user->createToken('oauth_' . $provider . '_' . Str::limit($deviceId, 80, ''), ['*'], $expiresAt)->plainTextToken;

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $token,
            'provider' => $provider,
        ]);
    }

    private function userPayload(User $user): array
    {
        $user->makeVisible('phone', 'email', 'is_whatsapp');

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
            'avatar_color',
            'activity_locked'
        );

        if ($user->role === 'manager') {
            $user->loadMissing('team');
            $data['team'] = $user->team;
        } elseif ($user->role === 'player') {
            $user->loadMissing('playerProfile');
            $data['player_profile'] = $user->playerProfile;
        }

        return $data;
    }
}
