<?php

namespace App\Http\Middleware;

use App\Models\MaintenanceModule;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleMaintenance
{
    private const CACHE_TTL = 120;

    public function handle(Request $request, Closure $next, string ...$modules): Response
    {
        $user = $request->user();

        if ($this->shouldBypass($user)) {
            return $next($request);
        }

        $activeModules = $this->getActiveModules();

        foreach ($modules as $module) {
            if (isset($activeModules[$module])) {
                $maint = $activeModules[$module];
                $isRead = $request->isMethod('GET') || $request->isMethod('HEAD');

                if ($isRead && $maint['block_reads'] === false) {
                    continue;
                }

                return response()->json([
                    'message' => $maint['message'] ?? 'هذه الميزة غير متاحة حالياً due to maintenance',
                    'module' => $module,
                    'maintenance' => true,
                ], 503);
            }
        }

        return $next($request);
    }

    private function shouldBypass(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if ($user->role === 'sub_admin') {
            return $user->hasPermission('settings.view');
        }

        return false;
    }

    private function getActiveModules(): array
    {
        return Cache::remember('maintenance:active_modules', self::CACHE_TTL, function () {
            $modules = MaintenanceModule::where('enabled', true)->get();

            $active = [];
            foreach ($modules as $m) {
                if ($m->isActive()) {
                    $active[$m->module] = [
                        'message' => $m->message,
                        'block_reads' => $m->block_reads,
                    ];
                }
            }

            return $active;
        });
    }
}
