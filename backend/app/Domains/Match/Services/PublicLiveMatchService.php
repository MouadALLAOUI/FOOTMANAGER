<?php

namespace App\Domains\Match\Services;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentFoulRuleService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Cache;

class PublicLiveMatchService
{
    public function __construct(
        private readonly TournamentFoulRuleService $foulRules,
    ) {}

    /**
     * Locate match by its unguessable public token.
     * Enforces token validity (min 20 chars).
     */
    public function findByToken(string $token): FootballMatch
    {
        $token = trim($token);

        if (strlen($token) < 20) {
            throw (new ModelNotFoundException)->setModel(FootballMatch::class, [$token]);
        }

        $match = FootballMatch::query()
            ->where('public_token', $token)
            ->with([
                'homeTeam',
                'awayTeam',
                'stadium',
                'competition',
                'referees.referee',
                'fixture.round',
                'fixture.group',
                'fixture.stadium',
                'fixture.latestPendingSubmission',
            ])
            ->first();

        if (! $match) {
            throw (new ModelNotFoundException)->setModel(FootballMatch::class, [$token]);
        }

        return $match;
    }

    /**
     * Get authoritative match data and incremental events.
     *
     * @param  int|null  $sinceId Client's last known event ID
     * @param  string|null  $sinceTime Client's last polled timestamp
     */
    public function getMatchData(FootballMatch $match, ?int $sinceId = null, ?string $sinceTime = null): array
    {
        $cacheKey = "live_pub_{$match->public_token}_{$sinceId}_" . ($sinceTime ? md5($sinceTime) : 'all');

        return Cache::remember($cacheKey, 3, function () use ($match, $sinceId, $sinceTime) {
            return $this->buildPayload($match, $sinceId, $sinceTime);
        });
    }

    protected function buildPayload(FootballMatch $match, ?int $sinceId = null, ?string $sinceTime = null): array
    {
        $fixture = $match->fixture;
        if (! $fixture && $match->id) {
            $fixture = Fixture::where('match_id', $match->id)->first();
        }

        $pendingSubmission = $fixture?->latestPendingSubmission;
        $isPendingSubmission = $pendingSubmission && $pendingSubmission->status === 'pending';

        $isOfficial = ! $isPendingSubmission;
        $approvalStatus = $isOfficial ? 'approved' : 'pending';
        $officialLabel = $isOfficial ? null : 'النتيجة غير رسمية';

        $statusRaw = $match->status?->value ?? (string) $match->status;
        $isFinished = $match->status === MatchStatus::Finished || $statusRaw === 'finished';
        $isLive = in_array($match->status, MatchStatus::live(), true)
            || in_array($statusRaw, ['first_half', 'second_half', 'halftime', 'extra_time', 'penalties'], true);

        $statusText = match ($statusRaw) {
            'first_half' => 'مباشر (الشوط الأول)',
            'second_half' => 'مباشر (الشوط الثاني)',
            'halftime' => 'استراحة',
            'extra_time' => 'أشواط إضافية',
            'penalties' => 'ركلات ترجيح',
            'finished' => 'انتهت',
            'cancelled' => 'ملغاة',
            'postponed' => 'مؤجلة',
            default => 'قادمة',
        };

        // Score resolution
        $hasDatabaseEvents = MatchEvent::where('match_id', $match->id)->exists();
        if ($isPendingSubmission && ! $hasDatabaseEvents) {
            $homeScore = (int) $pendingSubmission->home_score;
            $awayScore = (int) $pendingSubmission->away_score;
        } else {
            $homeScore = (int) $match->home_score;
            $awayScore = (int) $match->away_score;
        }

        // Tournament and Venue context
        $tournament = null;
        if ($match->competition instanceof Tournament) {
            $tournament = $match->competition;
        } elseif ($fixture?->competition instanceof Tournament) {
            $tournament = $fixture->competition;
        } elseif ($fixture?->competition_id) {
            $tournament = Tournament::find($fixture->competition_id);
        }

        $tournamentName = $tournament?->name ?? $match->competition?->name ?? 'مباراة ودية';
        $roundName = $fixture?->round?->name ?? $fixture?->group?->name ?? 'مباراة عامة';
        $groupName = $fixture?->group?->name ?? null;

        $stadiumName = $match->stadium?->name ?? $fixture?->stadium?->name ?? 'ملعب معتمد';
        $stadiumCity = $match->stadium?->city ?? $fixture?->stadium?->city ?? ($tournament?->location ?? 'تنغير');

        $referee = $match->referees->first()?->referee?->name ?? 'طاقم تحكيم معتمد';

        // Foul rules & counters
        $foulData = $this->resolveFouls($match, $fixture, $tournament, $pendingSubmission);

        // Events extraction & incremental logic
        [$newEvents, $updatedEvents, $maxEventId] = $this->resolveEvents($match, $pendingSubmission, $sinceId, $sinceTime);

        $publicUrl = $match->publicUrl();

        return [
            'match' => [
                'public_token' => $match->public_token,
                'public_url' => $publicUrl,
                'status' => $statusRaw,
                'status_text' => $statusText,
                'is_live' => $isLive,
                'is_finished' => $isFinished,
                'current_minute' => (int) ($match->current_minute ?? 0),
                'current_period' => $match->current_period,
                'home_score' => $homeScore,
                'away_score' => $awayScore,
                'home_penalties' => $match->home_penalties,
                'away_penalties' => $match->away_penalties,
                'home_team' => [
                    'id' => $match->homeTeam?->id,
                    'name' => $match->homeTeam?->name ?? 'الفريق الأول',
                    'logo_url' => $match->homeTeam?->logo_url,
                ],
                'away_team' => [
                    'id' => $match->awayTeam?->id,
                    'name' => $match->awayTeam?->name ?? 'الفريق الثاني',
                    'logo_url' => $match->awayTeam?->logo_url,
                ],
                'stadium' => [
                    'name' => $stadiumName,
                    'city' => $stadiumCity,
                ],
                'tournament' => [
                    'id' => $tournament?->id,
                    'name' => $tournamentName,
                    'round' => $roundName,
                    'group' => $groupName,
                ],
                'scheduled_at' => $fixture?->scheduled_at?->toIso8601String() ?? $match->kicked_off_at?->toIso8601String(),
                'referee_name' => $referee,
                'is_official' => $isOfficial,
                'approval_status' => $approvalStatus,
                'official_label' => $officialLabel,
                'fouls' => $foulData,
                'share' => [
                    'whatsapp_text' => "تابع المباراة مباشرة عبر أجي نقصرو ⚽\nشاهد النتيجة والأهداف وأحداث المباراة هنا:\n{$publicUrl}",
                    'whatsapp_url' => 'https://wa.me/?text=' . urlencode("تابع المباراة مباشرة عبر أجي نقصرو ⚽\nشاهد النتيجة والأهداف وأحداث المباراة هنا:\n{$publicUrl}"),
                ],
            ],
            'events' => $newEvents,
            'updated_events' => $updatedEvents,
            'last_event_id' => $maxEventId,
            'server_time' => now()->toIso8601String(),
        ];
    }

    protected function resolveFouls(
        FootballMatch $match,
        ?Fixture $fixture,
        ?Tournament $tournament,
        $pendingSubmission
    ): array {
        if (! $tournament || ! $fixture || ! $this->foulRules->active($tournament)) {
            // Count fouls directly from events if any
            $homeId = $match->home_team_id;
            $awayId = $match->away_team_id;

            $homeCount = MatchEvent::where('match_id', $match->id)
                ->where('type', MatchEventType::Foul->value)
                ->where('team_id', $homeId)
                ->count();

            $awayCount = MatchEvent::where('match_id', $match->id)
                ->where('type', MatchEventType::Foul->value)
                ->where('team_id', $awayId)
                ->count();

            return [
                'enabled' => $homeCount > 0 || $awayCount > 0,
                'threshold' => 5,
                'penalty_threshold' => 6,
                'home_count' => $homeCount,
                'away_count' => $awayCount,
                'home_warning' => $homeCount === 5,
                'away_warning' => $awayCount === 5,
                'home_penalty' => $homeCount >= 6,
                'away_penalty' => $awayCount >= 6,
            ];
        }

        $status = $this->foulRules->status($fixture, $tournament);
        $threshold = (int) ($status['settings']['team_threshold'] ?? 5);

        $homeCount = 0;
        $awayCount = 0;

        foreach ($status['teams'] ?? [] as $tRow) {
            if ((int) $tRow['team_id'] === (int) $match->home_team_id) {
                $homeCount = max($homeCount, (int) $tRow['count']);
            }
            if ((int) $tRow['team_id'] === (int) $match->away_team_id) {
                $awayCount = max($awayCount, (int) $tRow['count']);
            }
        }

        return [
            'enabled' => true,
            'threshold' => $threshold,
            'penalty_threshold' => $threshold + 1,
            'home_count' => $homeCount,
            'away_count' => $awayCount,
            'home_warning' => $homeCount === $threshold,
            'away_warning' => $awayCount === $threshold,
            'home_penalty' => $homeCount > $threshold,
            'away_penalty' => $awayCount > $threshold,
        ];
    }

    protected function resolveEvents(
        FootballMatch $match,
        $pendingSubmission,
        ?int $sinceId,
        ?string $sinceTime
    ): array {
        $dbEvents = MatchEvent::query()
            ->where('match_id', $match->id)
            ->with(['team', 'player', 'assistPlayer'])
            ->orderBy('id', 'asc')
            ->get();

        if ($dbEvents->isNotEmpty()) {
            $formatted = $dbEvents->map(fn (MatchEvent $e) => $this->formatEvent($e));
            $maxId = $dbEvents->max('id') ?? 0;

            if ($sinceId === null) {
                // Initial load: return all events, sorted newest first
                $eventsList = $formatted->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])->values()->all();

                return [$eventsList, [], $maxId];
            }

            // Incremental polling: new events after sinceId
            $new = $formatted->where('id', '>', $sinceId)
                ->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])
                ->values()
                ->all();

            // Updated events: id <= sinceId and updated_at > sinceTime
            $updated = [];
            if ($sinceTime) {
                $sinceCarbon = Carbon::parse($sinceTime);
                $updated = $formatted->filter(function ($e) use ($sinceId, $sinceCarbon) {
                    return $e['id'] <= $sinceId && Carbon::parse($e['updated_at'])->gt($sinceCarbon);
                })->values()->all();
            }

            return [$new, $updated, $maxId];
        }

        // Fallback to pending delegated submission events if no DB events yet
        if ($pendingSubmission && ! empty($pendingSubmission->events) && is_array($pendingSubmission->events)) {
            $submissionEvents = collect($pendingSubmission->events)->values();
            $maxId = $submissionEvents->count();

            $formatted = $submissionEvents->map(function ($ev, $idx) use ($match) {
                $team = $ev['team_id'] == $match->home_team_id ? $match->homeTeam : $match->awayTeam;
                $playerName = $ev['player'] ?? $ev['description'] ?? 'لاعب';

                return [
                    'id' => $idx + 1,
                    'type' => $ev['type'] ?? 'event',
                    'minute' => (int) ($ev['minute'] ?? 0),
                    'added_time' => (int) ($ev['added_time'] ?? 0),
                    'team_id' => $ev['team_id'] ?? null,
                    'team_name' => $team?->name ?? '',
                    'player_id' => $ev['player_id'] ?? null,
                    'player_name' => $playerName,
                    'player_photo_url' => null,
                    'assist_player_id' => $ev['assist_player_id'] ?? null,
                    'assist_player_name' => $ev['assist'] ?? $ev['assist_player'] ?? null,
                    'description' => $ev['description'] ?? $playerName,
                    'icon' => $ev['icon'] ?? null,
                    'metadata' => $ev['metadata'] ?? null,
                    'created_at' => $pendingSubmission->created_at?->toIso8601String() ?? now()->toIso8601String(),
                    'updated_at' => $pendingSubmission->updated_at?->toIso8601String() ?? now()->toIso8601String(),
                ];
            });

            if ($sinceId === null) {
                $eventsList = $formatted->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])->values()->all();

                return [$eventsList, [], $maxId];
            }

            $new = $formatted->where('id', '>', $sinceId)
                ->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])
                ->values()
                ->all();

            return [$new, [], $maxId];
        }

        return [[], [], 0];
    }

    protected function formatEvent(MatchEvent $event): array
    {
        $playerName = $event->player?->name ?? $event->description ?? '';
        $playerPhotoUrl = $event->player?->photo_thumbnail_url ?? $event->player?->photo_url ?? null;

        return [
            'id' => $event->id,
            'type' => $event->type?->value ?? (string) $event->type,
            'punishment' => $event->punishment?->value ?? (string) $event->punishment,
            'minute' => (int) $event->minute,
            'added_time' => (int) $event->added_time,
            'team_id' => $event->team_id,
            'team_name' => $event->team?->name ?? '',
            'player_id' => $event->player_id,
            'player_name' => $playerName,
            'player_photo_url' => $playerPhotoUrl,
            'assist_player_id' => $event->assist_player_id,
            'assist_player_name' => $event->assistPlayer?->name ?? ($event->metadata['in'] ?? null),
            'description' => $event->description,
            'icon' => $event->icon,
            'metadata' => $event->metadata,
            'created_at' => $event->created_at?->toIso8601String(),
            'updated_at' => $event->updated_at?->toIso8601String(),
        ];
    }
}
