<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$slugs): Response
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        foreach ($slugs as $slug) {
            if ($request->user()->hasPermission($slug)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Unauthorized. You do not have the required permission.'], 403);
    }
}
