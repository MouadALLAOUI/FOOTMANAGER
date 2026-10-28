<?php

namespace App\Http\Controllers\Public;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchPunishment;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\MatchLineup;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\TeamMatchPlayer;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSquadMember;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class PlayerProfileController extends Controller
{
    public function show(mixed $player): JsonResponse
    {
        $playerModel = $player instanceof Player
            ? $player
            : (is_numeric($player)
                ? Player::query()->find((int) $player)
                : Player::query()->where('name', $player)->first());

        if (! $playerModel) {
            return response()->json([
                'message' => 'اللاعب غير موجود',
            ], 404);
        }

        $playerModel->load(['team', 'user', 'playerProfile']);
        $profile = $playerModel->playerProfile;

        // 1. Total Goals (verified from MatchEvent & TeamMatchPlayer)
        $tournamentGoals = MatchEvent::query()
            ->where('player_id', $playerModel->id)
            ->whereIn('type', [MatchEventType::Goal, MatchEventType::PenaltyGoal])
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Cancelled]))
            ->count();

        $friendlyGoals = (int) TeamMatchPlayer::query()
            ->where('player_id', $playerModel->id)
            ->whereHas('matchRequest', fn ($q) => $q->whereNotIn('status', ['cancelled', 'rejected']))
            ->sum('goals');

        $totalGoals = $tournamentGoals + $friendlyGoals;

        // 2. Total Assists
        $tournamentAssists = MatchEvent::query()
            ->where(function ($q) use ($playerModel) {
                $q->where('assist_player_id', $playerModel->id)
                    ->orWhere(function ($sq) use ($playerModel) {
                        $sq->where('player_id', $playerModel->id)
                            ->where('type', MatchEventType::Assist);
                    });
            })
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Cancelled]))
            ->count();

        $friendlyAssists = (int) TeamMatchPlayer::query()
            ->where('player_id', $playerModel->id)
            ->whereHas('matchRequest', fn ($q) => $q->whereNotIn('status', ['cancelled', 'rejected']))
            ->sum('assists');

        $totalAssists = $tournamentAssists + $friendlyAssists;

        // 3. Disciplinary Cards
        $yellowCards = MatchEvent::query()
            ->where('player_id', $playerModel->id)
            ->where(function ($q) {
                $q->where('type', MatchEventType::YellowCard)
                    ->orWhere(fn ($sq) => $sq->where('type', MatchEventType::Foul)->where('punishment', MatchPunishment::Yellow));
            })
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Cancelled]))
            ->count();

        $redCards = MatchEvent::query()
            ->where('player_id', $playerModel->id)
            ->where(function ($q) {
                $q->whereIn('type', [MatchEventType::RedCard, MatchEventType::SecondYellow])
                    ->orWhere(fn ($sq) => $sq->where('type', MatchEventType::Foul)->whereIn('punishment', [MatchPunishment::Red, MatchPunishment::SecondYellow]));
            })
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Cancelled]))
            ->count();

        // 4. Total Matches Played
        $tournamentMatchesFromLineup = MatchLineup::query()
            ->where('player_id', $playerModel->id)
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Cancelled]))
            ->pluck('match_id')
            ->filter();

        $tournamentMatchesFromEvents = MatchEvent::query()
            ->where('player_id', $playerModel->id)
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Cancelled]))
            ->pluck('match_id')
            ->filter();

        $uniqueTournamentMatchesCount = $tournamentMatchesFromLineup->merge($tournamentMatchesFromEvents)->unique()->count();

        $friendlyMatchesCount = TeamMatchPlayer::query()
            ->where('player_id', $playerModel->id)
            ->where('played', true)
            ->whereHas('matchRequest', fn ($q) => $q->whereNotIn('status', ['cancelled', 'rejected']))
            ->distinct('match_request_id')
            ->count('match_request_id');

        $totalMatchesPlayed = $uniqueTournamentMatchesCount + $friendlyMatchesCount;

        // 5. Tournaments Participation & Active Tournaments
        $squadTournamentIds = TournamentSquadMember::query()
            ->where('player_id', $playerModel->id)
            ->pluck('tournament_id');

        $teamTournamentIds = $playerModel->team_id
            ? TournamentTeam::query()
                ->where('team_id', $playerModel->team_id)
                ->whereIn('status', [TournamentTeam::STATUS_REGISTERED, TournamentTeam::STATUS_PENDING])
                ->pluck('tournament_id')
            : collect();

        $allTournamentIds = $squadTournamentIds->merge($teamTournamentIds)->unique()->values();
        $tournamentsCount = $allTournamentIds->count();

        $currentTournaments = Tournament::query()
            ->whereIn('id', $allTournamentIds)
            ->whereIn('status', [
                Tournament::STATUS_OPEN_FOR_REGISTRATION,
                Tournament::STATUS_REGISTRATION_CLOSED,
                Tournament::STATUS_IN_PROGRESS,
            ])
            ->get()
            ->map(function (Tournament $t) use ($playerModel) {
                $logoUrl = null;
                if ($t->logo_path) {
                    $logoUrl = str_starts_with($t->logo_path, 'http')
                        ? $t->logo_path
                        : Storage::disk('public')->url($t->logo_path);
                }

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'slug' => $t->slug,
                    'status' => $t->status,
                    'location' => $t->location,
                    'logo_url' => $logoUrl,
                    'tournament_format' => $t->tournament_format,
                    'team_name' => $playerModel->team?->name,
                    'team_logo_url' => $playerModel->team?->logo_url,
                ];
            });

        $avatarUrl = $playerModel->photo_url ?? $profile?->photo_url ?? $playerModel->user?->avatar_url;

        return response()->json([
            'player' => [
                'id' => $playerModel->id,
                'name' => $playerModel->name,
                'position' => $playerModel->position,
                'preferred_position' => $playerModel->preferred_position,
                'number' => $playerModel->number,
                'role' => $playerModel->role,
                'is_essential' => (bool) $playerModel->is_essential,
                'status' => $playerModel->status,
                'preferred_foot' => $playerModel->preferred_foot,
                'height_cm' => $playerModel->height_cm,
                'weight_kg' => $playerModel->weight_kg,
                'joined_at' => $playerModel->joined_at,
                'avatar_url' => $avatarUrl,
                'age' => $profile?->age,
                'skill_level' => $profile?->skill_level,
                'preferred_formats' => $profile?->preferred_formats ?? [],
                'team' => $playerModel->team ? [
                    'id' => $playerModel->team->id,
                    'name' => $playerModel->team->name,
                    'city' => $playerModel->team->city,
                    'category' => $playerModel->team->category,
                    'logo_url' => $playerModel->team->logo_url,
                ] : null,
            ],
            'stats' => [
                'goals' => $totalGoals,
                'tournaments_count' => $tournamentsCount,
                'matches_played' => $totalMatchesPlayed,
                'assists' => $totalAssists,
                'yellow_cards' => $yellowCards,
                'red_cards' => $redCards,
            ],
            'current_tournaments' => $currentTournaments,
        ]);
    }
}
