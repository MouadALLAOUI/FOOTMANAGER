<?php

namespace App\Domains\Match\Models;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchDelegatedSubmission extends Model
{
    protected $fillable = [
        'fixture_id',
        'match_delegated_token_id',
        'home_score',
        'away_score',
        'home_penalties',
        'away_penalties',
        'extra_time',
        'notes',
        'events',
        'recorder_name',
        'recorder_phone',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'anomalies',
        'is_disputed',
        'dispute_reason',
        'disputed_by_team_id',
        'disputed_by_user_id',
        'disputed_at',
        'client_meta',
    ];

    protected function casts(): array
    {
        return [
            'home_score' => 'integer',
            'away_score' => 'integer',
            'home_penalties' => 'integer',
            'away_penalties' => 'integer',
            'extra_time' => 'boolean',
            'events' => 'array',
            'anomalies' => 'array',
            'is_disputed' => 'boolean',
            'reviewed_at' => 'datetime',
            'disputed_at' => 'datetime',
            'client_meta' => 'array',
        ];
    }

    public function getEventsAttribute($value): array
    {
        $events = is_string($value) ? json_decode($value, true) : ($value ?? []);
        if (empty($events) || ! is_array($events)) {
            return [];
        }

        $playerIds = collect($events)->flatMap(function ($e) {
            return array_filter([$e['player_id'] ?? null, $e['assist_player_id'] ?? null]);
        })->unique()->values();

        if ($playerIds->isEmpty()) {
            return $events;
        }

        $players = \App\Domains\Player\Models\Player::whereIn('id', $playerIds)->get()->keyBy('id');

        return array_map(function ($e) use ($players) {
            $pid = $e['player_id'] ?? null;
            $aid = $e['assist_player_id'] ?? null;

            if ($pid && isset($players[$pid])) {
                $p = $players[$pid];
                if (empty($e['player'])) {
                    $e['player'] = $p->name;
                }
                if (empty($e['description'])) {
                    $e['description'] = $p->name;
                }
                if (! isset($e['player_number'])) {
                    $e['player_number'] = $p->number;
                }
            }

            if ($aid && isset($players[$aid])) {
                $ap = $players[$aid];
                if (empty($e['assist_player']) && empty($e['assist'])) {
                    $e['assist_player'] = $ap->name;
                    $e['assist'] = $ap->name;
                }
                if (! isset($e['assist_player_number'])) {
                    $e['assist_player_number'] = $ap->number;
                }
            }

            return $e;
        }, $events);
    }

    public function fixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class, 'fixture_id');
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(MatchDelegatedToken::class, 'match_delegated_token_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function disputedByTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'disputed_by_team_id');
    }

    public function disputedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disputed_by_user_id');
    }
}
