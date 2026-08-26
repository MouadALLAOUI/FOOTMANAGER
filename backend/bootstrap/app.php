<?php

use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Events;
use App\Domains\Team\Listeners;
use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureAccountNotBlocked;
use App\Http\Middleware\EnsureActivityNotLocked;
use App\Http\Middleware\EnsureAdminAccess;
use App\Http\Middleware\EnsureCommitteeApproved;
use App\Http\Middleware\EnsureIsAdmin;
use App\Http\Middleware\EnsureManagerApproved;
use App\Http\Middleware\EnsureModuleMaintenance;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnsurePlayerApproved;
use App\Http\Middleware\EnsureTerrainOwner;
use App\Http\Middleware\EnsureUserApproved;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withEvents(discover: [
        Events::class => Listeners::class,
        App\Domains\Booking\Events::class => App\Domains\Booking\Listeners::class,
        App\Domains\Match\Events::class => App\Domains\Match\Listeners::class,
        App\Domains\Player\Events::class => App\Domains\Player\Listeners::class,
        App\Domains\Social\Events::class => App\Domains\Social\Listeners::class,
        App\Domains\Review\Events::class => App\Domains\Review\Listeners::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [
            AddSecurityHeaders::class,
            EnsureAccountNotBlocked::class,
        ]);

        $middleware->alias([
            'admin' => EnsureIsAdmin::class,
            'admin.access' => EnsureAdminAccess::class,
            'permission' => EnsurePermission::class,
            'manager.approved' => EnsureManagerApproved::class,
            'committee.approved' => EnsureCommitteeApproved::class,
            'terrain.owner' => EnsureTerrainOwner::class,
            'player.approved' => EnsurePlayerApproved::class,
            'user.approved' => EnsureUserApproved::class,
            'activity.not_locked' => EnsureActivityNotLocked::class,
            'account.not_blocked' => EnsureAccountNotBlocked::class,
            'module.maintenance' => EnsureModuleMaintenance::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (DomainException $e) {
            $code = $e->getCode() >= 400 ? $e->getCode() : 422;

            return response()->json([
                'message' => $e->getMessage(),
                'errors' => [],
            ], $code);
        });
    })->create();
