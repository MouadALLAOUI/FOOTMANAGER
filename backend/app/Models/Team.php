<?php

namespace App\Models;

use App\Models\TerrainBooking;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Team extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'logo_url',
        'logo_path',
        'member_count',
        'category',
        'association_name',
        'city',
        'region',
        'description',
        'primary_color',
        'secondary_color',
        'primary_stadium_id',
        'points',
        'matches_played',
        'wins',
        'draws',
        'losses',
        'goals_for',
        'goals_against',
        'goal_difference',
        'manager_id',
    ];

    protected function casts(): array
    {
        return [
            'member_count' => 'integer',
            'points' => 'integer',
            'matches_played' => 'integer',
            'wins' => 'integer',
            'draws' => 'integer',
            'losses' => 'integer',
            'goals_for' => 'integer',
            'goals_against' => 'integer',
            'goal_difference' => 'integer',
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        if ($this->logo_path) {
            return Storage::disk('public')->url($this->logo_path);
        }
        return $this->attributes['logo_url'] ?? null;
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function primaryStadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'primary_stadium_id');
    }

    public function hostedMatches(): HasMany
    {
        return $this->hasMany(MatchRequest::class, 'host_team_id');
    }

    public function opponentMatches(): HasMany
    {
        return $this->hasMany(MatchRequest::class, 'opponent_team_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class, 'team_id');
    }

    public function terrainBookings(): HasMany
    {
        return $this->hasMany(TerrainBooking::class, 'team_id');
    }
}
