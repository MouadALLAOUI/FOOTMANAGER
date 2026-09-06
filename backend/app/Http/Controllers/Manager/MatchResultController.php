<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchPunishment;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
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
        $teamId = app(\App\Domains\Shared\Support\CurrentTeamResolver::class)->teamIdFor($user);

        $matches = MatchRequest::with([
            'hostTeam',
            'opponentTeam.manager',
            'stadium',
            'footballMatch.events' => fn ($q) => $q->with(['team', 'player', 'assistPlayer'])->orderBy('minute')->orderBy('id'),
        ])
            ->whereIn('status', ['accepted', 'live'])
            ->whereIn('score_status', ['none', 'disputed'])
            ->where(function ($q) {
                $q->where('status', 'live')
                    ->orWhere('match_datetime', '<=', now()->subHour());
            })
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
        $teamId = app(\App\Domains\Shared\Support\CurrentTeamResolver::class)->teamIdFor($user);

        $matches = MatchRequest::with([
            'hostTeam',
            'opponentTeam.manager',
            'stadium',
            'scoreSubmittedBy',
            'footballMatch.events' => fn ($q) => $q->with(['team', 'player', 'assistPlayer'])->orderBy('minute')->orderBy('id'),
        ])
            ->whereIn('status', ['accepted', 'live'])
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

        $validated = $request->validate([
            'host_score' => 'required|integer|min:0',
            'opponent_score' => 'required|integer|min:0',
            'events' => 'nullable|array',
            'events.*.type' => 'required|string',
            'events.*.team_id' => 'required|integer',
            'events.*.player_id' => 'nullable|integer',
            'events.*.assist_player_id' => 'nullable|integer',
            'events.*.minute' => 'nullable|integer|min:1|max:130',
            'events.*.description' => 'nullable|string|max:255',
        ]);

        $match = MatchRequest::with(['hostTeam', 'opponentTeam', 'footballMatch'])
            ->where('id', $matchId)
            ->whereIn('status', ['accepted', 'live'])
            ->whereIn('score_status', ['none', 'disputed'])
            ->firstOrFail();

        if ($match->status !== 'live' && $match->match_datetime && $match->match_datetime->gt(now()->subHour())) {
            return response()->json(['message' => 'لا يمكن تسجيل النتيجة قبل مرور ساعة على المباراة'], 422);
        }

        $isParticipant = $user->managedTeams()->whereIn('id', [$match->host_team_id, $match->opponent_team_id])->exists();
        if (! $isParticipant) {
            return response()->json(['message' => 'غير مصرح لك بتسجيل نتيجة هذه المباراة'], 403);
        }

        DB::transaction(function () use ($match, $validated, $user) {
            $match->update([
                'host_score' => $validated['host_score'],
                'opponent_score' => $validated['opponent_score'],
                'score_submitted_by' => $user->id,
                'score_status' => 'pending_confirmation',
            ]);

            $footballMatch = FootballMatch::firstOrCreate(
                ['match_request_id' => $match->id],
                [
                    'home_team_id' => $match->host_team_id,
                    'away_team_id' => $match->opponent_team_id,
                    'stadium_id' => $match->stadium_id,
                    'status' => MatchStatus::Scheduled,
                    'current_period' => 'full_time',
                    'home_score' => $validated['host_score'],
                    'away_score' => $validated['opponent_score'],
                    'created_by' => $user->id,
                ]
            );

            $footballMatch->update([
                'home_score' => $validated['host_score'],
                'away_score' => $validated['opponent_score'],
                'current_period' => 'full_time',
            ]);

            if (array_key_exists('events', $validated)) {
                MatchEvent::where('match_id', $footballMatch->id)->delete();
                if (! empty($validated['events'])) {
                    foreach ($validated['events'] as $evt) {
                        $rawType = $evt['type'] ?? 'goal';
                        $type = MatchEventType::tryFrom($rawType) ?? MatchEventType::Goal;
                        $punishment = null;
                        if ($type === MatchEventType::YellowCard) {
                            $type = MatchEventType::Foul;
                            $punishment = MatchPunishment::Yellow;
                        } elseif ($type === MatchEventType::SecondYellow) {
                            $type = MatchEventType::Foul;
                            $punishment = MatchPunishment::SecondYellow;
                        } elseif ($type === MatchEventType::RedCard) {
                            $type = MatchEventType::Foul;
                            $punishment = MatchPunishment::Red;
                        }

                        MatchEvent::create([
                            'match_id' => $footballMatch->id,
                            'team_id' => $evt['team_id'] ?? null,
                            'player_id' => $evt['player_id'] ?? null,
                            'assist_player_id' => $evt['assist_player_id'] ?? null,
                            'type' => $type,
                            'punishment' => $punishment,
                            'minute' => $evt['minute'] ?? 1,
                            'description' => $evt['description'] ?? null,
                            'icon' => $type->icon(),
                            'created_by' => $user->id,
                        ]);
                    }
                }
            }
        });

        $isHost = $user->managedTeams()->where('id', $match->host_team_id)->exists();
        $opponentManagerId = $isHost
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

        $fresh = $match->fresh()->load([
            'hostTeam',
            'opponentTeam.manager',
            'footballMatch.events' => fn ($q) => $q->with(['team', 'player', 'assistPlayer'])->orderBy('minute')->orderBy('id'),
        ]);
        $fresh->opponentTeam?->manager?->makeVisible('phone');

        return response()->json([
            'message' => 'تم تسجيل النتيجة بنجاح. في انتظار تأكيد الفريق المنافس',
            'match' => $fresh,
        ]);
    }

    public function confirmScore(Request $request, int $matchId): JsonResponse
    {
        $user = $request->user();

        $match = MatchRequest::with(['hostTeam', 'opponentTeam', 'footballMatch'])
            ->where('id', $matchId)
            ->whereIn('status', ['accepted', 'live'])
            ->where('score_status', 'pending_confirmation')
            ->firstOrFail();

        if ($match->score_submitted_by === $user->id) {
            return response()->json(['message' => 'لا يمكنك تأكيد نتيجة التي سجلتها بنفسك'], 403);
        }

        $isParticipant = $user->managedTeams()->whereIn('id', [$match->host_team_id, $match->opponent_team_id])->exists();
        if (! $isParticipant) {
            return response()->json(['message' => 'غير مصرح لك بتأكيد نتيجة هذه المباراة'], 403);
        }

        // When the match was tracked live through the shared event system, the
        // MatchFinishedListener already applied the team records via the
        // FootballMatch. Skip the increments here to avoid double counting.
        $recordsAlreadyApplied = $match->footballMatch()
            ->where('status', MatchStatus::Finished->value)
            ->exists();

        DB::transaction(function () use ($match, $recordsAlreadyApplied) {
            $match->update([
                'score_status' => 'confirmed',
                'status' => 'completed',
            ]);

            if ($match->footballMatch) {
                $match->footballMatch->update([
                    'status' => MatchStatus::Finished,
                    'is_confirmed' => true,
                    'ended_at' => now(),
                ]);
            }

            if ($recordsAlreadyApplied) {
                return;
            }

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

        $match = MatchRequest::with(['hostTeam', 'opponentTeam'])
            ->where('id', $matchId)
            ->whereIn('status', ['accepted', 'live'])
            ->where('score_status', 'pending_confirmation')
            ->firstOrFail();

        if ($match->score_submitted_by === $user->id) {
            return response()->json(['message' => 'لا يمكنك الاعتراض على نتيجة سجلتها بنفسك'], 403);
        }

        $isParticipant = $user->managedTeams()->whereIn('id', [$match->host_team_id, $match->opponent_team_id])->exists();
        if (! $isParticipant) {
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
