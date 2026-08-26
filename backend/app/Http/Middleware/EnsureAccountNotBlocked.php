<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if (in_array($user->status, ['blocked', 'rejected'], true)) {
            return response()->json([
                'message' => $user->status === 'blocked'
                    ? 'تم حظر حسابك من قبل الإدارة'
                    : 'تم رفض طلب تسجيلك من قبل الإدارة',
                'status' => $user->status,
            ], 403);
        }

        return $next($request);
    }
}
