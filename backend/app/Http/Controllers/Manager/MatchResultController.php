<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MatchResultController extends Controller
{
    public function pendingScores(Request $request): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->team->id;

        $matches = MatchRequest::with(['hostTeam', 'opponentTeam.manager', 'stadium'])
            ->where('status', 'accepted')
            ->whereIn('score_status', ['none', 'disputed'])
            ->where('match_datetime', '<=', now()->subHour())
            ->where(function ($q) use ($teamId) {
                $q->where('host_team_id', $teamId)
                    ->orWhere('opponent_team_id', $teamId);
            })
            ->orderBy('match_datetime', 'asc')
            ->get();

        $matches->each(fn ($m) => $m->opponentTeam?->manager?->makeVisible('phone'));

        return response()->json(['matches' => $matches]);
    }

    public function pendingConfirmations(Request $request): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->team->id;

        $matches = MatchRequest::with(['hostTeam', 'opponentTeam.manager', 'stadium', 'scoreSubmittedBy'])
            ->where('status', 'accepted')
            ->where('score_status', 'pending_confirmation')
            ->where(function ($q) use ($teamId) {
                $q->where('host_team_id', $teamId)
                    ->orWhere('opponent_team_id', $teamId);
            })
            ->where('score_submitted_by', '!=', $user->id)
            ->orderBy('match_datetime', 'asc')
            ->get();

        $matches->each(fn ($m) => $m->opponentTeam?->manager?->makeVisible('phone'));

        return response()->json(['matches' => $matches]);
    }

    public function submitScore(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->team->id;

        $validated = $request->validate([
            'host_score' => 'required|integer|min:0',
            'opponent_score' => 'required|integer|min:0',
        ]);

        $match = MatchRequest::with(['hostTeam', 'opponentTeam'])
            ->where('id', $matchId)
            ->where('status', 'accepted')
            ->whereIn('score_status', ['none', 'disputed'])
            ->firstOrFail();

        if ($match->match_datetime->gt(now()->subHour())) {
            return response()->json(['message' => 'لا يمكن تسجيل النتيجة قبل مرور ساعة على المباراة'], 422);
        }

        if ($match->host_team_id != $teamId && $match->opponent_team_id != $teamId) {
            return response()->json(['message' => 'غير مصرح لك بتسجيل نتيجة هذه المباراة'], 403);
        }

        $match->update([
            'host_score' => $validated['host_score'],
            'opponent_score' => $validated['opponent_score'],
            'score_submitted_by' => $user->id,
            'score_status' => 'pending_confirmation',
        ]);

        $opponentManagerId = $match->host_team_id === $teamId
            ? $match->opponentTeam?->manager_id
            : $match->hostTeam?->manager_id;

        if ($opponentManagerId) {
            NotificationService::push(
                (int) $opponentManagerId,
                'score_submitted',
                'تم تسجيل نتيجة مباراة',
                "الفريق {$user->team?->name} سجل نتيجة المباراة — يرجى مراجعتها وتأكيدها",
                ['match_id' => $match->id],
                '/dashboard',
            );
        }

        $fresh = $match->fresh()->load(['hostTeam', 'opponentTeam.manager']);
        $fresh->opponentTeam?->manager?->makeVisible('phone');

        return response()->json([
            'message' => 'تم تسجيل النتيجة بنجاح. في انتظار تأكيد الفريق المنافس',
            'match' => $fresh,
        ]);
    }

    public function confirmScore(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->team->id;

        $match = MatchRequest::with(['hostTeam', 'opponentTeam'])
            ->where('id', $matchId)
            ->where('status', 'accepted')
            ->where('score_status', 'pending_confirmation')
            ->firstOrFail();

        if ($match->score_submitted_by === $user->id) {
            return response()->json(['message' => 'لا يمكنك تأكيد نتيجة التي سجلتها بنفسك'], 403);
        }

        if ($match->host_team_id != $teamId && $match->opponent_team_id != $teamId) {
            return response()->json(['message' => 'غير مصرح لك بتأكيد نتيجة هذه المباراة'], 403);
        }

        DB::transaction(function () use ($match) {
            $match->update([
                'score_status' => 'confirmed',
                'status' => 'completed',
            ]);

            $hostTeam = $match->hostTeam;
            $opponentTeam = $match->opponentTeam;

            $hostScore = $match->host_score;
            $oppScore = $match->opponent_score;

            // Update host team
            $hostTeam->increment('matches_played');
            $hostTeam->increment('goals_for', $hostScore);
            $hostTeam->increment('goals_against', $oppScore);
            $hostTeam->update([
                'goal_difference' => $hostTeam->fresh()->goals_for - $hostTeam->fresh()->goals_against,
            ]);

            // Update opponent team
            $opponentTeam->increment('matches_played');
            $opponentTeam->increment('goals_for', $oppScore);
            $opponentTeam->increment('goals_against', $hostScore);
            $opponentTeam->update([
                'goal_difference' => $opponentTeam->fresh()->goals_for - $opponentTeam->fresh()->goals_against,
            ]);

            if ($hostScore > $oppScore) {
                $hostTeam->increment('wins');
                $hostTeam->increment('points', 3);
                $opponentTeam->increment('losses');
            } elseif ($hostScore < $oppScore) {
                $opponentTeam->increment('wins');
                $opponentTeam->increment('points', 3);
                $hostTeam->increment('losses');
            } else {
                $hostTeam->increment('draws');
                $hostTeam->increment('points');
                $opponentTeam->increment('draws');
                $opponentTeam->increment('points');
            }

            $this->updatePlayerStandings($match, $hostScore, $oppScore);
        });

        PublicCache::flushTeamLeaderboard();
        PublicCache::flushPlayerLeaderboard();

        $match->load(['hostTeam', 'opponentTeam']);
        if ($match->score_submitted_by) {
            NotificationService::push(
                (int) $match->score_submitted_by,
                'score_confirmed',
                'تم تأكيد نتيجة المباراة',
                'الفريق المنافس أكد النتيجة — تم تحديث الترتيب',
                ['match_id' => $match->id],
                '/dashboard',
            );
        }

        return response()->json([
            'message' => 'تم تأكيد النتيجة وتحديث ترتيب الفرق بنجاح',
            'match' => $match->fresh()->load(['hostTeam', 'opponentTeam']),
        ]);
    }

    public function disputeScore(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->team->id;

        $match = MatchRequest::with(['hostTeam', 'opponentTeam'])
            ->where('id', $matchId)
            ->where('status', 'accepted')
            ->where('score_status', 'pending_confirmation')
            ->firstOrFail();

        if ($match->score_submitted_by === $user->id) {
            return response()->json(['message' => 'لا يمكنك الاعتراض على نتيجة سجلتها بنفسك'], 403);
        }

        if ($match->host_team_id != $teamId && $match->opponent_team_id != $teamId) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        $submittedBy = $match->score_submitted_by;

        $match->update([
            'score_status' => 'disputed',
            'host_score' => null,
            'opponent_score' => null,
            'score_submitted_by' => null,
        ]);

        if ($submittedBy) {
            NotificationService::push(
                (int) $submittedBy,
                'score_disputed',
                'تم رفض النتيجة المسجلة',
                'الفريق المنافس اعترض على النتيجة — يرجى إعادة تسجيل النتيجة الصحيحة',
                ['match_id' => $match->id],
                '/dashboard',
            );
        }

        return response()->json([
            'message' => 'تم الاعتراض على النتيجة. يمكنك إعادة تسجيل النتيجة',
            'match' => $match->fresh()->load(['hostTeam', 'opponentTeam']),
        ]);
    }

    private function updatePlayerStandings(MatchRequest $match, int $hostScore, int $oppScore): void
    {
        if (! $match->mercenary_player_id) {
            return;
        }

        $profile = PlayerProfile::where('user_id', $match->mercenary_player_id)->first();

        if (! $profile) {
            return;
        }

        $profile->increment('matches_played');

        if ($hostScore > $oppScore) {
            $profile->increment('wins');
            $profile->increment('points', 3);
        } elseif ($hostScore < $oppScore) {
            $profile->increment('losses');
        } else {
            $profile->increment('draws');
            $profile->increment('points');
        }

        $profile->fresh();
        $played = max(1, $profile->matches_played);
        $rating = round(($profile->points / ($played * 3)) * 5, 1);
        $profile->update(['rating' => $rating]);
    }
}
