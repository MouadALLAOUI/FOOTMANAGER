<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\PlayerTeamHistory;
use App\Domains\Player\Models\PlayerTransfer;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class PlayerCareerService
{
    public function history(int $userId): Collection
    {
        return PlayerTeamHistory::query()
            ->where('user_id', $userId)
            ->with('team:id,name,logo_path')
            ->orderByDesc('is_current')
            ->orderByDesc('joined_at')
            ->get();
    }

    public function transfers(int $userId): Collection
    {
        return PlayerTransfer::query()
            ->where('user_id', $userId)
            ->with('fromTeam:id,name,logo_path')
            ->with('toTeam:id,name,logo_path')
            ->orderByDesc('transferred_at')
            ->get();
    }

    public function recordMembership(User $user, Team $team): PlayerTeamHistory
    {
        $this->endCurrentMembership($user->id, $team->name);

        $history = PlayerTeamHistory::create([
            'user_id' => $user->id,
            'team_id' => $team->id,
            'team_name' => $team->name,
            'joined_at' => now()->toDateString(),
            'is_current' => true,
            'matches_played' => 0,
            'goals' => 0,
        ]);

        PlayerTransfer::create([
            'user_id' => $user->id,
            'from_team_id' => null,
            'to_team_id' => $team->id,
            'from_team_name' => null,
            'to_team_name' => $team->name,
            'transferred_at' => now(),
            'type' => PlayerTransfer::TYPE_JOIN,
        ]);

        return $history;
    }

    public function recordTransfer(User $user, Team $from, Team $to): PlayerTeamHistory
    {
        $this->endCurrentMembership($user->id, $to->name);

        $history = PlayerTeamHistory::create([
            'user_id' => $user->id,
            'team_id' => $to->id,
            'team_name' => $to->name,
            'joined_at' => now()->toDateString(),
            'is_current' => true,
            'matches_played' => 0,
            'goals' => 0,
        ]);

        PlayerTransfer::create([
            'user_id' => $user->id,
            'from_team_id' => $from->id,
            'to_team_id' => $to->id,
            'from_team_name' => $from->name,
            'to_team_name' => $to->name,
            'transferred_at' => now(),
            'type' => PlayerTransfer::TYPE_TRANSFER,
        ]);

        return $history;
    }

    public function recordLeave(User $user, Team $team): void
    {
        $this->endCurrentMembership($user->id, null);

        PlayerTransfer::create([
            'user_id' => $user->id,
            'from_team_id' => $team->id,
            'to_team_id' => null,
            'from_team_name' => $team->name,
            'to_team_name' => null,
            'transferred_at' => now(),
            'type' => PlayerTransfer::TYPE_LEAVE,
        ]);
    }

    public function refreshMatchTotals(int $userId, int $teamId): void
    {
        $current = PlayerTeamHistory::where('user_id', $userId)
            ->where('team_id', $teamId)
            ->where('is_current', true)
            ->first();

        if (! $current) {
            return;
        }

        $totals = DB::table('player_match_stats')
            ->where('user_id', $userId)
            ->where('team_id', $teamId)
            ->selectRaw('COUNT(*) as matches_played')
            ->selectRaw('SUM(goals) as goals')
            ->first();

        $current->matches_played = (int) ($totals->matches_played ?? 0);
        $current->goals = (int) ($totals->goals ?? 0);
        $current->save();
    }

    private function endCurrentMembership(int $userId, ?string $newTeamName): void
    {
        PlayerTeamHistory::where('user_id', $userId)
            ->where('is_current', true)
            ->update([
                'is_current' => false,
                'left_at' => now()->toDateString(),
            ]);
    }
}
