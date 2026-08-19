<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Domains\Tournament\Resources\TournamentRegistrationResource;
use App\Domains\Tournament\Services\TournamentRegistrationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentRegistrationController extends Controller
{
    public function __construct(private readonly TournamentRegistrationService $registrationService)
    {
    }

    /**
     * Backend-driven registration availability for a tournament (guest-accessible).
     */
    public function availability(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        $registered = $tournament->registeredTeamsCount();
        $remaining = max(0, (int) $tournament->teams_count - $registered);
        $availability = $this->availabilityState($tournament, $remaining);

        return response()->json(['data' => [
            'tournament_id' => $tournament->id,
            'name' => $tournament->name,
            'status' => $tournament->status,
            'availability' => $availability,
            'can_register' => $availability === 'open',
            'teams_count' => (int) $tournament->teams_count,
            'registered_teams' => $registered,
            'remaining_slots' => $remaining,
            'registration_fee' => $tournament->registration_fee,
            'requires_registration_fee' => $tournament->registrationRequiresFee(),
            'registration_start_at' => $tournament->registration_start_at?->toIso8601String(),
            'registration_end_at' => $tournament->registration_end_at?->toIso8601String(),
        ]]);
    }

    /**
     * The authenticated user's eligible team(s) and their registration for this tournament.
     */
    public function me(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);
        $user = $request->user();

        $team = Team::query()->where('manager_id', $user->id)->first();

        $registration = null;
        if ($team) {
            $pivot = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $team->id)
                ->first();

            $registration = $pivot ? [
                'status' => $pivot->status,
                'payment_status' => $pivot->payment_status,
                'created_at' => $pivot->created_at?->toIso8601String(),
            ] : null;
        }

        return response()->json(['data' => [
            'eligible' => $user->role === 'manager' && $user->status === 'approved' && $team !== null,
            'reason' => ! $team
                ? 'no_team'
                : ($user->role !== 'manager' ? 'not_manager' : ($user->status !== 'approved' ? 'not_approved' : null)),
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'logo_url' => $team->logo_url,
                'category' => $team->category,
                'city' => $team->city,
            ] : null,
            'registration' => $registration,
        ]]);
    }

    /**
     * Submit a registration for one of the user's own teams.
     */
    public function register(Request $request, string $tournament): JsonResponse
    {
        $user = $request->user();
        $this->assertManagerApproved($user);

        $tournament = $this->resolveTournament($tournament);

        $team = Team::query()->find((int) $request->input('team_id'));

        if (! $team || (int) $team->manager_id !== (int) $user->id || $team->is_free) {
            throw new DomainException('لا يمكنك التسجيل بهذا الفريق', 422);
        }

        $registration = $this->registrationService->register($tournament, $team);

        return response()->json(['data' => new TournamentRegistrationResource($registration->load('team'))], 201);
    }

    /**
     * Cancel a pending registration for the user's team.
     */
    public function destroy(Request $request, string $tournament): JsonResponse
    {
        $user = $request->user();
        $this->assertManagerApproved($user);

        $tournament = $this->resolveTournament($tournament);

        $team = Team::query()->where('manager_id', $user->id)->first();

        if (! $team) {
            throw new DomainException('يجب إنشاء ملف الفريق أولاً', 422);
        }

        $registration = $this->registrationService->cancel($tournament, $team);

        return response()->json(['data' => new TournamentRegistrationResource($registration->load('team'))]);
    }

    private function assertManagerApproved(User $user): void
    {
        if ($user->role !== 'manager') {
            throw new DomainException('التسجيل في البطولات متاح للمسيرين فقط', 403);
        }

        if ($user->status !== 'approved') {
            throw new DomainException('حسابك قيد المراجعة، يجب موافقة الإدارة أولاً', 403);
        }
    }

    private function availabilityState(Tournament $tournament, int $remaining): string
    {
        if ($tournament->status === Tournament::STATUS_OPEN_FOR_REGISTRATION) {
            if (! $tournament->registrationWindowOpen()) {
                if ($tournament->registration_start_at && $tournament->registration_start_at->isFuture()) {
                    return 'not_started';
                }

                return 'closed';
            }

            if ($remaining <= 0) {
                return 'full';
            }

            return 'open';
        }

        if ($tournament->status === Tournament::STATUS_REGISTRATION_CLOSED) {
            return 'closed';
        }

        return 'started';
    }

    private function resolveTournament(string $key): Tournament
    {
        $tournament = ctype_digit($key)
            ? Tournament::query()->find((int) $key)
            : Tournament::query()->where('slug', $key)->first();

        if (! $tournament || ! $tournament->isVisiblePublicly()) {
            abort(404, 'البطولة غير موجودة أو غير منشورة');
        }

        return $tournament;
    }
}
