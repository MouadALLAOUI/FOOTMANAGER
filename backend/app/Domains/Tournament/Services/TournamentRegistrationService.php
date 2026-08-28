<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Facades\DB;

class TournamentRegistrationService
{
    /**
     * Register a team for a tournament as a pending request.
     *
     * Authoritative guards (all inside a row-locked transaction):
     * - status + registration window must allow registration
     * - duplicate registered/pending registrations are rejected (409)
     * - a cancelled registration is re-opened as pending
     * - a rejected registration cannot be re-registered
     * - capacity is enforced (only confirmed registrations consume slots)
     */
    public function register(Tournament $tournament, Team $team): TournamentTeam
    {
        return DB::transaction(function () use ($tournament, $team) {
            $tournament = Tournament::query()->lockForUpdate()->findOrFail($tournament->id);

            if (! $tournament->canRegister()) {
                throw new DomainException('التسجيل في هذه البطولة غير متاح حالياً', 422);
            }

            $existing = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $team->id)
                ->first();

            if ($existing && in_array($existing->status, [TournamentTeam::STATUS_REGISTERED, TournamentTeam::STATUS_PENDING], true)) {
                throw new DomainException('فريقك مسجل بالفعل أو طلبك قيد المراجعة', 409);
            }

            if ($existing && $existing->status === TournamentTeam::STATUS_REJECTED) {
                throw new DomainException('تم رفض طلب تسجيل فريقك في هذه البطولة ولا يمكن إعادة التسجيل', 422);
            }

            if ($existing && $existing->status === TournamentTeam::STATUS_CANCELLED) {
                $existing->forceFill([
                    'status' => TournamentTeam::STATUS_PENDING,
                    'payment_status' => $this->initialPaymentStatus($tournament),
                ])->save();

                return $existing;
            }

            $registered = $tournament->registeredTeamsCount();

            if ($registered >= $tournament->teams_count) {
                throw new DomainException('اكتمل عدد الفرق في البطولة', 422);
            }

            return TournamentTeam::query()->create([
                'tournament_id' => $tournament->id,
                'team_id' => $team->id,
                'status' => TournamentTeam::STATUS_PENDING,
                'payment_status' => $this->initialPaymentStatus($tournament),
            ]);
        });
    }

    /**
     * Cancel a pending or, before the draw is confirmed, a confirmed
     * registration so the manager can drop out of the tournament.
     */
    public function cancel(Tournament $tournament, Team $team): TournamentTeam
    {
        return DB::transaction(function () use ($tournament, $team) {
            $registration = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $team->id)
                ->whereIn('status', [TournamentTeam::STATUS_PENDING, TournamentTeam::STATUS_REGISTERED])
                ->first();

            if (! $registration) {
                throw new DomainException('لا يوجد طلب تسجيل قابل للإلغاء', 422);
            }

            if ($registration->status === TournamentTeam::STATUS_REGISTERED
                && ($tournament->draw_confirmed_at !== null || ! $tournament->isEditable())) {
                throw new DomainException('لا يمكن إلغاء التسجيل بعد تأكيد القرعة', 422);
            }

            $registration->forceFill([
                'status' => TournamentTeam::STATUS_CANCELLED,
                'group_id' => null,
                'group_position' => null,
            ])->save();

            return $registration;
        });
    }

    /**
     * Payment is never auto-completed. A fee-based tournament starts with a
     * pending payment state that only the committee can confirm.
     */
    public function initialPaymentStatus(Tournament $tournament): string
    {
        return $tournament->registrationRequiresFee()
            ? TournamentTeam::PAYMENT_PENDING
            : TournamentTeam::PAYMENT_NOT_REQUIRED;
    }
}
