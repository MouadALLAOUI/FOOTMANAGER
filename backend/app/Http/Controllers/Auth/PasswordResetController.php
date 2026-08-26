<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Step 1 — request a reset link.
     *
     * Always responds with the same generic message so the endpoint
     * cannot be used to discover whether an account exists.
     */
    public function sendResetLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:255'],
        ]);

        $user = $this->findUserByIdentity($data['login']);

        if ($user === null) {
            return $this->genericSentResponse();
        }

        $status = Password::broker()->sendResetLink(['email' => $user->email]);

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'عدد كبير من المحاولات. حاول مجدداً بعد دقيقة.',
                'retry_after' => 60,
            ], 429);
        }

        return $this->genericSentResponse();
    }

    /**
     * Step 2 — validate a token without consuming it.
     */
    public function validateToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'login' => ['required', 'string', 'max:255'],
        ]);

        $valid = false;

        if (($user = $this->findUserByIdentity($validated['login'])) !== null) {
            $valid = Password::broker()->getRepository()->exists($user, $validated['token']);
        }

        return response()->json([
            'valid' => $valid,
            'message' => $valid ? 'الرمز صالح' : 'الرابط غير صالح أو منتهي الصلاحية',
        ]);
    }

    /**
     * Step 3 — set the new password.
     *
     * On success every existing authentication session is revoked
     * (User::booted() observer revokes all tokens when password changes).
     */
    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $this->findUserByIdentity($data['login']);

        if ($user === null) {
            throw $this->invalidTokenException();
        }

        $status = Password::reset([
            'email' => $user->email,
            'token' => $data['token'],
            'password' => $data['password'],
            'password_confirmation' => $request->input('password_confirmation'),
        ], function (User $u, string $password) {
            $u->forceFill(['password' => $password])->save();
        });

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن',
            ]);
        }

        if ($status === Password::INVALID_TOKEN || $status === Password::INVALID_USER) {
            throw $this->invalidTokenException();
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'عدد كبير من المحاولات. حاول مجدداً بعد قليل.',
            ], 429);
        }

        return response()->json([
            'message' => 'الرابط غير صالح أو منتهي الصلاحية',
        ], 422);
    }

    private function findUserByIdentity(string $identity): ?User
    {
        if ($identity === '') {
            return null;
        }

        /** @var User|null $user */
        $user = User::where('email', $identity)
            ->orWhere('phone', $identity)
            ->first();

        if ($user === null || empty($user->email)) {
            return null;
        }

        return $user;
    }

    private function genericSentResponse(): JsonResponse
    {
        return response()->json([
            'message' => 'إذا كان هذا الحساب يستخدم بريداً إلكترونياً، ستصل رسالة إعادة التعيين خلال دقائق. تحقق أيضاً من صندوق الرسائل غير المرغوبة.',
        ]);
    }

    private function invalidTokenException(): ValidationException
    {
        return ValidationException::withMessages([
            'token' => 'الرابط غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً.',
        ]);
    }
}
