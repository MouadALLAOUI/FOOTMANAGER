<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCommitteeApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'غير مصرح'], 401);
        }

        if ($user->role !== 'committee') {
            return response()->json(['message' => 'غير مصرح لك بالوصول إلى هذا القسم'], 403);
        }

        if ($user->status !== 'approved') {
            $message = match ($user->status) {
                'blocked' => 'تم حظر حسابك من قبل الإدارة',
                'pending' => 'حسابك قيد المراجعة من قبل الإدارة',
                'rejected' => 'تم رفض طلب تسجيلك من قبل الإدارة',
                default => 'غير مصرح لك بالوصول',
            };

            return response()->json(['message' => $message], 403);
        }

        return $next($request);
    }
}
