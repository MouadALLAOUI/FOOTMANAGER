<?php

namespace App\Domains\Match\Services;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\MatchLineup;
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
        $officialLabel = $isOfficial ? null : 'النتيجة قيد المراجعة من طرف اللجنة';

        $statusRaw = $match->status?->value ?? (string) $match->status;
        $isFinished = $match->status === MatchStatus::Finished || $statusRaw === 'finished';
        $isLive = in_array($match->status, MatchStatus::live(), true)
            || in_array($statusRaw, ['first_half', 'second_half', 'halftime', 'extra_time', 'penalties'], true);

        if ($isPendingSubmission && (! empty($pendingSubmission->client_meta['is_finished']) || ($pendingSubmission->client_meta['match_status'] ?? '') === 'finished')) {
            $statusRaw = 'finished';
            $isFinished = true;
            $isLive = false;
        } elseif ($isPendingSubmission && ! empty($pendingSubmission->client_meta['match_status'])) {
            $subStatus = $pendingSubmission->client_meta['match_status'];
            $statusRaw = $subStatus;
            $isFinished = $subStatus === 'finished';
            $isLive = in_array($subStatus, ['first_half', 'second_half', 'halftime', 'extra_time', 'penalties'], true);
        }

        $statusText = match ($statusRaw) {
            'first_half' => $isPendingSubmission ? 'مباشر (الشوط الأول) - قيد المراجعة' : 'مباشر (الشوط الأول)',
            'second_half' => $isPendingSubmission ? 'مباشر (الشوط الثاني) - قيد المراجعة' : 'مباشر (الشوط الثاني)',
            'halftime' => $isPendingSubmission ? 'استراحة (قيد المراجعة)' : 'استراحة',
            'extra_time' => 'أشواط إضافية',
            'penalties' => 'ركلات ترجيح',
            'finished' => $isPendingSubmission ? 'انتهت (في انتظار مراجعة اللجنة)' : 'انتهت',
            'cancelled' => 'ملغاة',
            'postponed' => 'مؤجلة',
            default => 'قادمة',
        };

        $homeTeam = $match->homeTeam ?? $fixture?->homeTeam;
        $awayTeam = $match->awayTeam ?? $fixture?->awayTeam;

        // Score resolution: If there is an active pending delegated submission, always show its score
        if ($isPendingSubmission) {
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
        [$newEvents, $updatedEvents, $maxEventId, $totalEventsCount] = $this->resolveEvents($match, $pendingSubmission, $sinceId, $sinceTime);

        // Lineup resolution (authoritative confirmed lineup)
        $lineupData = $this->resolveLineup($match, $fixture, $pendingSubmission);

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
                    'id' => $homeTeam?->id,
                    'name' => $homeTeam?->name ?? 'الفريق الأول',
                    'logo_url' => $homeTeam?->logo_url,
                    'score' => $homeScore,
                ],
                'away_team' => [
                    'id' => $awayTeam?->id,
                    'name' => $awayTeam?->name ?? 'الفريق الثاني',
                    'logo_url' => $awayTeam?->logo_url,
                    'score' => $awayScore,
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
            'total_events' => $totalEventsCount,
            'lineup' => $lineupData,
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

        $isPendingSubmission = $pendingSubmission && $pendingSubmission->status === 'pending';
        $hasSubmissionEvents = $isPendingSubmission && ! empty($pendingSubmission->events) && is_array($pendingSubmission->events);

        // When a pending delegated submission exists with events, it reflects the latest live match events
        if ($hasSubmissionEvents) {
            $submissionEvents = collect($pendingSubmission->events)->values();
            $maxId = 0;
            $maxDbId = (int) ($dbEvents->max('id') ?? 0);
            $dbEventsById = $dbEvents->keyBy('id');
            $dbEventsByIndex = $dbEvents->values();
            $knownSubmissionMax = (int) $submissionEvents->pluck('id')->filter(fn ($v) => is_numeric($v))->max();
            $baseMaxId = max($maxDbId, $knownSubmissionMax);

            $homeTeam = $match->homeTeam ?? $match->fixture?->homeTeam;
            $awayTeam = $match->awayTeam ?? $match->fixture?->awayTeam;
            $homeTeamId = $homeTeam?->id ?? $match->home_team_id;
            $awayTeamId = $awayTeam?->id ?? $match->away_team_id;

            $playerIds = $submissionEvents->pluck('player_id')->filter()->unique()->all();
            $playersById = ! empty($playerIds) ? Player::whereIn('id', $playerIds)->get()->keyBy('id') : collect();

            $formatted = $submissionEvents->map(function ($ev, $idx) use (
                $homeTeam,
                $awayTeam,
                $homeTeamId,
                $awayTeamId,
                $pendingSubmission,
                $dbEventsById,
                $dbEventsByIndex,
                $baseMaxId,
                $playersById,
                &$maxId
            ) {
                $evTeamId = isset($ev['team_id']) ? (int) $ev['team_id'] : null;
                $team = null;
                if ($evTeamId && $homeTeamId && $evTeamId === (int) $homeTeamId) {
                    $team = $homeTeam;
                } elseif ($evTeamId && $awayTeamId && $evTeamId === (int) $awayTeamId) {
                    $team = $awayTeam;
                } else {
                    $team = $homeTeam ?? $awayTeam;
                }

                // Resolve event ID:
                // 1. Explicit positive integer ID
                // 2. Correlate with existing DB event at the same index if available
                // 3. Fallback: synthetic ID strictly greater than any known event ID
                if (isset($ev['id']) && is_numeric($ev['id']) && (int) $ev['id'] > 0) {
                    $evId = (int) $ev['id'];
                } elseif (isset($dbEventsByIndex[$idx]) && $dbEventsByIndex[$idx]->id) {
                    $evId = (int) $dbEventsByIndex[$idx]->id;
                } else {
                    $offset = $idx - $dbEventsByIndex->count() + 1;
                    $evId = $baseMaxId + max(1, $offset);
                }

                if ($evId > $maxId) {
                    $maxId = $evId;
                }

                $playerModel = isset($ev['player_id']) ? $playersById->get($ev['player_id']) : null;
                $playerName = $ev['player'] ?? $ev['description'] ?? $playerModel?->name ?? 'لاعب';
                $assistName = $ev['assist'] ?? $ev['assist_player'] ?? null;
                $playerPhoto = $playerModel?->photo_thumbnail_url ?? $playerModel?->photo_url ?? null;

                if (isset($ev['id']) && $dbEventsById->has($ev['id'])) {
                    $dbEv = $dbEventsById->get($ev['id']);
                    $playerName = $dbEv->player?->name ?? $playerName;
                    $assistName = $dbEv->assistPlayer?->name ?? $assistName;
                    $playerPhoto = $dbEv->player?->photo_thumbnail_url ?? $dbEv->player?->photo_url ?? $playerPhoto;
                }

                return [
                    'id' => $evId,
                    'type' => $ev['type'] ?? 'event',
                    'punishment' => $ev['punishment'] ?? null,
                    'minute' => (int) ($ev['minute'] ?? 0),
                    'added_time' => (int) ($ev['added_time'] ?? 0),
                    'team_id' => $evTeamId ?? $team?->id,
                    'team_name' => $team?->name ?? '',
                    'player_id' => $ev['player_id'] ?? null,
                    'player_name' => $playerName,
                    'player_photo_url' => $playerPhoto,
                    'assist_player_id' => $ev['assist_player_id'] ?? null,
                    'assist_player_name' => $assistName,
                    'description' => $ev['description'] ?? $playerName,
                    'icon' => $ev['icon'] ?? null,
                    'metadata' => $ev['metadata'] ?? null,
                    'created_at' => $pendingSubmission->created_at?->toIso8601String() ?? now()->toIso8601String(),
                    'updated_at' => $pendingSubmission->updated_at?->toIso8601String() ?? now()->toIso8601String(),
                ];
            })->unique('id');

            $totalCount = $formatted->count();

            if ($sinceId === null || $sinceId > $maxId) {
                $eventsList = $formatted->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])->values()->all();

                return [$eventsList, [], $maxId, $totalCount];
            }

            $new = $formatted->where('id', '>', $sinceId)
                ->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])
                ->values()
                ->all();

            $updated = [];
            if ($sinceTime) {
                $sinceCarbon = Carbon::parse($sinceTime);
                $updated = $formatted->filter(function ($e) use ($sinceId, $sinceCarbon) {
                    return $e['id'] <= $sinceId && Carbon::parse($e['updated_at'])->gt($sinceCarbon);
                })->values()->all();
            }

            return [$new, $updated, $maxId, $totalCount];
        }

        if ($dbEvents->isNotEmpty()) {
            $formatted = $dbEvents->unique('id')->map(fn (MatchEvent $e) => $this->formatEvent($e));
            $maxId = (int) ($dbEvents->max('id') ?? 0);
            $totalCount = $formatted->count();

            if ($sinceId === null || $sinceId > $maxId) {
                // Initial load: return all events, sorted newest first
                $eventsList = $formatted->sortByDesc(fn ($e) => ($e['minute'] * 10000) + $e['id'])->values()->all();

                return [$eventsList, [], $maxId, $totalCount];
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

            return [$new, $updated, $maxId, $totalCount];
        }

        return [[], [], 0, 0];
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

    /**
     * Resolve the authoritative confirmed lineup for this match.
     * Uses MatchLineup records, distinguishing starters, bench, and sub in/out based on match events.
     * Gracefully falls back to confirmed presence records if available, otherwise reports unavailable.
     */
    public function resolveLineup(
        FootballMatch $match,
        ?Fixture $fixture,
        $pendingSubmission
    ): array {
        $homeTeam = $match->homeTeam ?? $fixture?->homeTeam;
        $awayTeam = $match->awayTeam ?? $fixture?->awayTeam;

        $homeTeamId = $homeTeam?->id ?? $match->home_team_id ?? $fixture?->home_team_id;
        $awayTeamId = $awayTeam?->id ?? $match->away_team_id ?? $fixture?->away_team_id;

        // 1. Authoritative MatchLineup records
        $lineups = MatchLineup::query()
            ->where('match_id', $match->id)
            ->with(['player'])
            ->orderBy('is_starter', 'desc')
            ->orderBy('order_index', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        // Check substitution events to know who was subbed out or subbed in
        $subEvents = MatchEvent::query()
            ->where('match_id', $match->id)
            ->where('type', MatchEventType::Substitution->value)
            ->get();

        $subOutPlayerIds = $subEvents->pluck('player_id')->filter()->all();
        $subInPlayerIds = $subEvents->pluck('assist_player_id')->filter()->all();

        if ($lineups->isNotEmpty()) {
            $formatLineupPlayer = function (MatchLineup $l) use ($subOutPlayerIds, $subInPlayerIds) {
                $player = $l->player;
                $isStarter = (bool) $l->is_starter;
                $isCaptain = (bool) $l->is_captain;
                $playerId = $l->player_id;

                $participationStatus = 'present';
                $statusLabel = 'حاضر';

                if (in_array($playerId, $subOutPlayerIds, true)) {
                    $participationStatus = 'subbed_out';
                    $statusLabel = 'تم استبداله';
                } elseif (in_array($playerId, $subInPlayerIds, true)) {
                    $participationStatus = 'subbed_in';
                    $statusLabel = 'شارك كبديل';
                } elseif ($isStarter) {
                    $participationStatus = 'starter';
                    $statusLabel = 'أساسي';
                } else {
                    $participationStatus = 'bench';
                    $statusLabel = 'احتياط';
                }

                return [
                    'id' => $playerId,
                    'name' => $player?->name ?? 'لاعب',
                    'number' => $l->shirt_number ?? $player?->number,
                    'position' => $l->position ?? $player?->position,
                    'is_starter' => $isStarter,
                    'is_captain' => $isCaptain,
                    'participation_status' => $participationStatus,
                    'status_label' => $statusLabel,
                    'photo_url' => $player?->photo_thumbnail_url ?? $player?->photo_url,
                ];
            };

            $homeLineups = $lineups->where('team_id', $homeTeamId)->map($formatLineupPlayer)->values();
            $awayLineups = $lineups->where('team_id', $awayTeamId)->map($formatLineupPlayer)->values();

            $hasStarters = $lineups->where('is_starter', true)->isNotEmpty();

            return [
                'available' => $homeLineups->isNotEmpty() || $awayLineups->isNotEmpty(),
                'has_starters' => $hasStarters,
                'home' => [
                    'team_id' => $homeTeamId,
                    'team_name' => $homeTeam?->name ?? 'الفريق الأول',
                    'team_logo_url' => $homeTeam?->logo_url,
                    'starters' => $hasStarters ? $homeLineups->where('is_starter', true)->values()->all() : [],
                    'substitutes' => $hasStarters ? $homeLineups->where('is_starter', false)->values()->all() : [],
                    'all' => $homeLineups->all(),
                ],
                'away' => [
                    'team_id' => $awayTeamId,
                    'team_name' => $awayTeam?->name ?? 'الفريق الثاني',
                    'team_logo_url' => $awayTeam?->logo_url,
                    'starters' => $hasStarters ? $awayLineups->where('is_starter', true)->values()->all() : [],
                    'substitutes' => $hasStarters ? $awayLineups->where('is_starter', false)->values()->all() : [],
                    'all' => $awayLineups->all(),
                ],
            ];
        }

        // 2. Fallback: Pending delegated submission presence in client_meta
        $metaPresence = $pendingSubmission?->client_meta['presence'] ?? null;
        if (! empty($metaPresence) && is_array($metaPresence)) {
            $homePlayerIds = array_filter((array) ($metaPresence['home'] ?? []));
            $awayPlayerIds = array_filter((array) ($metaPresence['away'] ?? []));

            $allIds = array_unique(array_merge($homePlayerIds, $awayPlayerIds));
            if (! empty($allIds)) {
                $players = Player::whereIn('id', $allIds)->get()->keyBy('id');

                $mapPlayerList = function (array $ids) use ($players) {
                    return collect($ids)->map(function ($id) use ($players) {
                        $p = $players->get($id);
                        if (! $p) return null;

                        return [
                            'id' => $p->id,
                            'name' => $p->name,
                            'number' => $p->number,
                            'position' => $p->position,
                            'is_starter' => false,
                            'is_captain' => false,
                            'participation_status' => 'present',
                            'status_label' => 'حاضر',
                            'photo_url' => $p->photo_thumbnail_url ?? $p->photo_url,
                        ];
                    })->filter()->values()->all();
                };

                $homeList = $mapPlayerList($homePlayerIds);
                $awayList = $mapPlayerList($awayPlayerIds);

                return [
                    'available' => ! empty($homeList) || ! empty($awayList),
                    'has_starters' => false,
                    'home' => [
                        'team_id' => $homeTeamId,
                        'team_name' => $homeTeam?->name ?? 'الفريق الأول',
                        'team_logo_url' => $homeTeam?->logo_url,
                        'starters' => [],
                        'substitutes' => [],
                        'all' => $homeList,
                    ],
                    'away' => [
                        'team_id' => $awayTeamId,
                        'team_name' => $awayTeam?->name ?? 'الفريق الثاني',
                        'team_logo_url' => $awayTeam?->logo_url,
                        'starters' => [],
                        'substitutes' => [],
                        'all' => $awayList,
                    ],
                ];
            }
        }

        return [
            'available' => false,
            'has_starters' => false,
            'home' => [
                'team_id' => $homeTeamId,
                'team_name' => $homeTeam?->name ?? 'الفريق الأول',
                'team_logo_url' => $homeTeam?->logo_url,
                'starters' => [],
                'substitutes' => [],
                'all' => [],
            ],
            'away' => [
                'team_id' => $awayTeamId,
                'team_name' => $awayTeam?->name ?? 'الفريق الثاني',
                'team_logo_url' => $awayTeam?->logo_url,
                'starters' => [],
                'substitutes' => [],
                'all' => [],
            ],
        ];
    }
}
