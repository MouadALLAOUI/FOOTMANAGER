<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\ManagerTournamentResource;
use App\Domains\Tournament\Services\TournamentRegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentController extends Controller
{
    public function __construct(private readonly TournamentRegistrationService $registrationService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tournaments = Tournament::query()
            ->with(['organizer'])
            ->with('allRegistrations')
            ->visible()
            ->whereIn('status', [
                Tournament::STATUS_OPEN_FOR_REGISTRATION,
                Tournament::STATUS_REGISTRATION_CLOSED,
                Tournament::STATUS_IN_PROGRESS,
                Tournament::STATUS_COMPLETED,
            ])
            ->latest()
            ->get();

        return response()->json(['data' => ManagerTournamentResource::collection($tournaments)]);
    }

    public function register(Request $request, Tournament $tournament): JsonResponse
    {
        $team = $request->user()->team;

        if (! $team) {
            throw new DomainException('يجب إنشاء ملف الفريق أولاً', 422);
        }

        if ($tournament->isHidden()) {
            throw new DomainException('هذه البطولة غير متاحة حالياً', 422);
        }

        $this->registrationService->register($tournament, $team);

        $tournament->load(['organizer', 'allRegistrations']);

        return response()->json(['data' => new ManagerTournamentResource($tournament)]);
    }

    public function cancel(Request $request, Tournament $tournament): JsonResponse
    {
        $team = $request->user()->team;

        if (! $team) {
            throw new DomainException('يجب إنشاء ملف الفريق أولاً', 422);
        }

        $this->registrationService->cancel($tournament, $team);

        $tournament->load(['organizer', 'allRegistrations']);

        return response()->json(['data' => new ManagerTournamentResource($tournament)]);
    }
}
