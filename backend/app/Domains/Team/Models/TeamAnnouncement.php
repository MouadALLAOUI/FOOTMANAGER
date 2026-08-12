<?php

namespace App\Domains\Team\Models;

use App\Domains\Player\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamAnnouncement extends Model
{
    use HasFactory;

    public const PRIORITY_NORMAL = 'normal';

    public const PRIORITY_IMPORTANT = 'important';

    public const PRIORITY_URGENT = 'urgent';

    protected $fillable = [
        'team_id',
        'title',
        'message',
        'priority',
        'visibility',
        'target_player_ids',
        'created_by',
        'scheduled_at',
        'published_at',
        'is_pinned',
    ];

    protected function casts(): array
    {
        return [
            'target_player_ids' => 'array',
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'is_pinned' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class, 'announcement_id');
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null;
    }

    public function isScheduled(): bool
    {
        return $this->scheduled_at !== null && $this->published_at === null;
    }

    public function isTargetedTo(Player $player): bool
    {
        if ($this->visibility === 'all') {
            return true;
        }

        return in_array($player->id, $this->target_player_ids ?? [], true);
    }
}
