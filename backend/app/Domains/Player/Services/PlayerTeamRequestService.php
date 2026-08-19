<?php

namespace App\Domains\Player\Services;

use App\Domains\Notification\Services\NotificationService;
use App\Domains\Player\Models\Player;
use App\Domains\Player\Models\PlayerTeamRequest;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PlayerTeamRequestService
{
    public function approve(PlayerTeamRequest $request, User $handler, ?string $teamName = null): PlayerTeamRequest
    {
        if ($request->status !== PlayerTeamRequest::STATUS_PENDING) {
            abort(422, 'يمكن فقط قبول الطلبات المعلقة.');
        }

        return DB::transaction(function () use ($request, $handler, $teamName) {
            $name = $teamName ?: ($request->team_name ?: 'فريق '.str()->random(6));

            $team = Team::create([
                'name' => $name,
                'manager_id' => null,
            ]);

            Player::create([
                'team_id' => $team->id,
                'user_id' => $request->player_id,
                'name' => $request->player->name,
                'position' => 'unknown',
                'status' => Player::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);

            $request->update([
                'status' => PlayerTeamRequest::STATUS_APPROVED,
                'handled_by' => $handler->id,
            ]);

            NotificationService::push(
                $request->player_id,
                'player_team_request_approved',
                'تم قبول طلب الانضمام',
                "تم قبول طلبك للانضمام لفريق \"{$name}\".",
                ['team_id' => $team->id, 'team_name' => $name],
            );

            return $request->fresh(['player', 'handler']);
        });
    }

    public function reject(PlayerTeamRequest $request, User $handler, ?string $reason = null): PlayerTeamRequest
    {
        if ($request->status !== PlayerTeamRequest::STATUS_PENDING) {
            abort(422, 'يمكن فقط رفض الطلبات المعلقة.');
        }

        $request->update([
            'status' => PlayerTeamRequest::STATUS_REJECTED,
            'handled_by' => $handler->id,
            'rejection_reason' => $reason,
        ]);

        NotificationService::push(
            $request->player_id,
            'player_team_request_rejected',
            'تم رفض طلب الانضمام',
            $reason ?: 'تم رفض طلبك للانضمام لفريق.',
            ['request_id' => $request->id],
        );

        return $request->fresh(['player', 'handler']);
    }
}
