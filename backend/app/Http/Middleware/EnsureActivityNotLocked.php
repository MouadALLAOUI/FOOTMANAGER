<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActivityNotLocked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'غير مصرح'], 401);
        }

        if ($user->isAdmin()) {
            return $next($request);
        }

        if ($user->activity_locked) {
            return response()->json([
                'message' => 'تم تقييد نشاط حسابك',
                'activity_locked' => true,
                'reason' => $user->activity_lock_reason,
                'locked_at' => $user->activity_locked_at,
            ], 403);
        }

        return $next($request);
    }
}
