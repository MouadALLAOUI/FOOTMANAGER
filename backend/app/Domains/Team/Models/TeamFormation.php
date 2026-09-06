<?php

namespace App\Domains\Team\Models;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Support\FormationPresets;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamFormation extends Model
{
    use HasFactory;

    /** Football formats this system supports, kept in sync with LineupService. */
    public const FORMATS = ['5v5', '7v7', '8v8', '11v11'];

    public const ROLE_STARTER = 'starter';

    public const ROLE_SUBSTITUTE = 'substitute';

    protected $fillable = [
        'team_id',
        'tournament_id',
        'name',
        'format',
        'formation',
        'preset_key',
        'captain_id',
        'vice_captain_id',
        'free_kick_taker_id',
        'penalty_taker_id',
        'corner_taker_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function captain(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'captain_id');
    }

    public function viceCaptain(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'vice_captain_id');
    }

    public function freeKickTaker(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'free_kick_taker_id');
    }

    public function penaltyTaker(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'penalty_taker_id');
    }

    public function cornerTaker(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'corner_taker_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(FormationPlayer::class, 'formation_id')
            ->orderBy('is_starter', 'desc')
            ->orderBy('sort_order');
    }

    public function starters(): HasMany
    {
        return $this->players()->where('is_starter', true);
    }

    public function substitutes(): HasMany
    {
        return $this->players()->where('is_starter', false);
    }

    /** Maximum starters allowed by the formation's format. */
    public function maxStarters(): int
    {
        return FormationPresets::startersForFormat((string) $this->format);
    }

    public function preset(): ?array
    {
        if (! $this->preset_key) {
            return null;
        }

        if (str_starts_with((string) $this->preset_key, 'custom:')) {
            return FormationPreset::query()
                ->whereKey((int) substr((string) $this->preset_key, 7))
                ->first()
                ?->toPreset();
        }

        return FormationPresets::find($this->preset_key);
    }
}
