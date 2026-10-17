<?php

namespace App\Http\Controllers\Public;

use App\Domains\Match\Services\DelegatedMatchEntryService;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentFoulRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicDelegatedMatchEntryController extends Controller
{
    public function __construct(
        private readonly DelegatedMatchEntryService $delegatedService,
        private readonly TournamentFoulRuleService $foulRules,
    ) {}

    /**
     * Get match details, teams, and rosters for the recorder.
     * Exposes NO personal data (no manager contacts, no player phones/personal info).
     */
    public function show(Request $request, string $token): JsonResponse
    {
        $tokenRecord = $this->delegatedService->findValidToken(
            $token,
            $request->ip()
        );

        $fixture = $tokenRecord->fixture;

        // Load players from both teams (name, number, position, photo only)
        $homePlayers = Player::query()
            ->where('team_id', $fixture->home_team_id)
            ->orderBy('is_essential', 'desc')
            ->orderBy('number')
            ->orderBy('name')
            ->get(['id', 'team_id', 'name', 'number', 'position', 'photo_path', 'photo_thumbnail_path'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'team_id' => $p->team_id,
                'name' => $p->name,
                'number' => $p->number,
                'position' => $p->position,
                'photo_url' => $p->photo_thumbnail_url ?? $p->photo_url,
            ]);

        $awayPlayers = Player::query()
            ->where('team_id', $fixture->away_team_id)
            ->orderBy('is_essential', 'desc')
            ->orderBy('number')
            ->orderBy('name')
            ->get(['id', 'team_id', 'name', 'number', 'position', 'photo_path', 'photo_thumbnail_path'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'team_id' => $p->team_id,
                'name' => $p->name,
                'number' => $p->number,
                'position' => $p->position,
                'photo_url' => $p->photo_thumbnail_url ?? $p->photo_url,
            ]);

        // Existing pending submission (if any)
        $existingSubmission = $tokenRecord->submissions()
            ->where('status', 'pending')
            ->latest()
            ->first();

        $tournament = $fixture->competition instanceof Tournament
            ? $fixture->competition
            : ($fixture->competition_id ? Tournament::find($fixture->competition_id) : null);

        $foulRulesData = $tournament ? [
            'enabled' => $this->foulRules->active($tournament),
            'settings' => $this->foulRules->settings($tournament),
        ] : [
            'enabled' => false,
            'settings' => $this->foulRules->settings(null),
        ];

        $match = $fixture->match;
        if (! $match && $fixture->match_id) {
            $match = \App\Domains\Match\Models\FootballMatch::find($fixture->match_id);
        }
        $matchEvents = $match ? $match->events()->with(['player', 'assistPlayer', 'team'])->orderBy('minute')->orderBy('id')->get() : collect();

        return response()->json([
            'data' => [
                'fixture' => [
                    'id' => $fixture->id,
                    'scheduled_at' => $fixture->scheduled_at,
                    'stadium' => $fixture->stadium ? ['id' => $fixture->stadium->id, 'name' => $fixture->stadium->name] : null,
                    'tournament_name' => $fixture->competition?->name,
                    'home_team' => [
                        'id' => $fixture->homeTeam?->id,
                        'name' => $fixture->homeTeam?->name,
                        'logo_url' => $fixture->homeTeam?->logo_url,
                    ],
                    'away_team' => [
                        'id' => $fixture->awayTeam?->id,
                        'name' => $fixture->awayTeam?->name,
                        'logo_url' => $fixture->awayTeam?->logo_url,
                    ],
                    'match' => $match ? [
                        'id' => $match->id,
                        'status' => $match->status?->value ?? (string) $match->status,
                        'home_score' => (int) $match->home_score,
                        'away_score' => (int) $match->away_score,
                        'home_penalties' => $match->home_penalties,
                        'away_penalties' => $match->away_penalties,
                        'extra_time' => (bool) $match->extra_time,
                        'current_minute' => (int) ($match->current_minute ?? 0),
                        'current_period' => $match->current_period,
                        'kicked_off_at' => $match->kicked_off_at?->toIso8601String(),
                        'started_at' => $match->started_at?->toIso8601String(),
                        'second_half_started_at' => $match->second_half_started_at?->toIso8601String(),
                        'match_duration_minutes' => $match->match_duration_minutes,
                        'half_duration_minutes' => $match->half_duration_minutes,
                        'first_half_extra_minutes' => $match->first_half_extra_minutes,
                        'second_half_extra_minutes' => $match->second_half_extra_minutes,
                        'public_token' => $match->ensurePublicToken(),
                    ] : null,
                ],
                'match_events' => $matchEvents->map(fn ($e) => [
                    'id' => $e->id,
                    'type' => $e->type?->value ?? (string) $e->type,
                    'team_id' => $e->team_id,
                    'player_id' => $e->player_id,
                    'player' => $e->player?->name ?? $e->description ?? '',
                    'assist_player_id' => $e->assist_player_id,
                    'assist' => $e->assistPlayer?->name ?? '',
                    'assist_player' => $e->assistPlayer?->name ?? '',
                    'minute' => (int) ($e->minute ?? 0),
                    'added_time' => (int) ($e->added_time ?? 0),
                    'half' => $e->half ?? ($e->minute > 45 ? 'second' : 'first'),
                    'goalType' => $e->goal_type ?? ($e->type?->value === 'penalty_goal' ? 'penalty' : 'regular'),
                    'punishment' => $e->punishment,
                    'reason' => $e->reason,
                    'note' => $e->note,
                    'metadata' => $e->metadata,
                    'description' => $e->description ?? $e->player?->name ?? '',
                ])->values(),
                'rosters' => [
                    'home' => $homePlayers,
                    'away' => $awayPlayers,
                ],
                'recorder' => [
                    'name' => $tokenRecord->recorder_name,
                    'phone' => $tokenRecord->recorder_phone,
                    'identified' => ! empty($tokenRecord->recorder_name) && ! empty($tokenRecord->recorder_phone),
                ],
                'submission' => $existingSubmission,
                'status' => $tokenRecord->status,
                'mode' => $tokenRecord->mode ?? 'full',
                'valid_until' => $tokenRecord->valid_until,
                'foul_rules' => $foulRulesData,
                'tournament' => $tournament ? [
                    'id' => $tournament->id,
                    'name' => $tournament->name,
                    'max_players_per_team' => $tournament->max_players_per_team,
                    'min_players_per_team' => $tournament->min_players_per_team,
                    'tournament_format' => $tournament->tournament_format,
                ] : null,
            ],
        ]);
    }

    /**
     * Get live foul status, counters, and penalty suggestions for this delegated match.
     */
    public function penalties(Request $request, string $token): JsonResponse
    {
        $tokenRecord = $this->delegatedService->findValidToken(
            $token,
            $request->ip()
        );

        $fixture = $tokenRecord->fixture;
        $tournament = $fixture->competition instanceof Tournament
            ? $fixture->competition
            : ($fixture->competition_id ? Tournament::find($fixture->competition_id) : null);

        if (! $tournament) {
            return response()->json([
                'data' => [
                    'enabled' => false,
                    'settings' => $this->foulRules->settings(null),
                    'teams' => [],
                    'players' => [],
                    'active_penalties' => [],
                    'pending_awards' => [],
                    'suggestions' => [],
                ],
            ]);
        }

        return response()->json([
            'data' => $this->foulRules->status($fixture, $tournament),
        ]);
    }

    /**
     * Identify the recorder (save name + phone).
     */
    public function identify(Request $request, string $token): JsonResponse
    {
        $name = trim((string) ($request->input('name') ?? $request->input('recorder_name') ?? ''));
        $phone = trim((string) ($request->input('phone') ?? $request->input('recorder_phone') ?? ''));

        if ($name === '' || $phone === '') {
            return response()->json([
                'message' => 'الاسم ورقم الهاتف مطلوبان',
                'errors' => [
                    'name' => ['حقل الاسم مطلوب.'],
                    'phone' => ['حقل الهاتف مطلوب.'],
                ],
            ], 422);
        }

        $tokenRecord = $this->delegatedService->findValidToken(
            $token,
            $request->ip()
        );

        $this->delegatedService->identifyRecorder(
            $tokenRecord,
            $name,
            $phone
        );

        return response()->json([
            'message' => 'تم تسجيل بيانات المندوب بنجاح',
            'recorder' => [
                'name' => $name,
                'phone' => $phone,
            ],
        ]);
    }

    /**
     * Submit match score, events, and notes.
     */
    public function submit(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'recorder_name' => 'sometimes|nullable|string|max:120',
            'recorder_phone' => 'sometimes|nullable|string|max:40',
            'home_score' => 'required|integer|min:0|max:99',
            'away_score' => 'required|integer|min:0|max:99',
            'home_penalties' => 'nullable|integer|min:0|max:99',
            'away_penalties' => 'nullable|integer|min:0|max:99',
            'extra_time' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:1000',
            'status' => 'sometimes|nullable|string|max:30',
            'current_minute' => 'sometimes|nullable|integer|min:0|max:150',
            'is_finished' => 'sometimes|boolean',
            'events' => 'sometimes|array',
            'events.*.id' => 'nullable|integer',
            'events.*._key' => 'nullable|string',
            'events.*.type' => 'required|string',
            'events.*.team_id' => 'required|integer',
            'events.*.player_id' => 'nullable|integer',
            'events.*.player' => 'nullable|string|max:120',
            'events.*.player_number' => 'nullable|integer',
            'events.*.description' => 'nullable|string|max:120',
            'events.*.assist_player_id' => 'nullable|integer',
            'events.*.assist' => 'nullable|string|max:120',
            'events.*.assist_player' => 'nullable|string|max:120',
            'events.*.minute' => 'nullable|integer|min:0|max:150',
            'events.*.half' => 'nullable|string',
            'events.*.goalType' => 'nullable|string',
            'events.*.punishment' => 'nullable|string',
            'events.*.reason' => 'nullable|string|max:255',
            'events.*.note' => 'nullable|string|max:500',
            'events.*.metadata' => 'sometimes|nullable|array',
            'presence' => 'sometimes|nullable|array',
            'presence.home' => 'sometimes|array',
            'presence.away' => 'sometimes|array',
        ]);

        $tokenRecord = $this->delegatedService->findValidToken(
            $token,
            $request->ip()
        );

        $submission = $this->delegatedService->submitResult(
            $tokenRecord,
            $validated,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'data' => $submission,
            'message' => 'تم إرسال نتيجة المباراة بنجاح وهي الآن بانتظار اعتماد اللجنة المنظمة',
        ], 201);
    }

    /**
     * Add a player to a team of the match via delegated link.
     */
    public function addPlayer(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'team_id' => 'required|integer',
            'name' => 'nullable|string|max:120',
            'number' => 'nullable|integer|min:0|max:99',
            'existing_player_id' => 'nullable|integer',
            'force' => 'sometimes|boolean',
        ]);

        $tokenRecord = $this->delegatedService->findValidToken(
            $token,
            $request->ip()
        );

        $result = $this->delegatedService->addPlayer(
            $tokenRecord,
            (int) $validated['team_id'],
            (string) ($validated['name'] ?? ''),
            isset($validated['number']) && $validated['number'] !== '' ? (int) $validated['number'] : null,
            isset($validated['existing_player_id']) ? (int) $validated['existing_player_id'] : null,
            (bool) ($validated['force'] ?? false)
        );

        return response()->json([
            'created' => $result['created'],
            'duplicate' => $result['duplicate'] ?? false,
            'data' => $result['player'] ?? null,
            'player' => $result['player'] ?? null,
            'duplicates' => $result['duplicates'] ?? [],
            'message' => $result['message'],
        ], $result['created'] ? 201 : 200);
    }
}
