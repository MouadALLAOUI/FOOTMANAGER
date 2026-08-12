<?php

namespace App\Domains\Shared\Support;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Models\Comment;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamAnnouncement;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Log;

class MorphMap
{
    public const SUPPORTED_TARGETS = [
        'team' => Team::class,
        'player' => Player::class,
        'stadium' => Stadium::class,
        'match' => FootballMatch::class,
        'announcement' => TeamAnnouncement::class,
        'activity' => Activity::class,
        'comment' => Comment::class,
        'chat_message' => MatchChatMessage::class,
        'player_review' => PlayerReview::class,
        'stadium_review' => StadiumReview::class,
        'booking' => TerrainBooking::class,
    ];

    public static function register(): void
    {
        Relation::morphMap(array_merge(static::SUPPORTED_TARGETS, [
            'user' => User::class,
        ]));
    }

    /**
     * Resolve a model class from a public target type key.
     */
    public static function classFor(string $type): ?string
    {
        return static::SUPPORTED_TARGETS[$type] ?? null;
    }

    /**
     * Resolve an actual model instance for a target type/id.
     */
    public static function resolve(string $type, int $id): ?Model
    {
        $class = static::classFor($type);

        if (! $class) {
            return null;
        }

        return $class::find($id);
    }

    /**
     * Resolve a target that may be provided as a string type or a FQCN.
     */
    public static function normalizeType(string $type): string
    {
        $class = static::SUPPORTED_TARGETS[$type] ?? null;

        if ($class) {
            return $class;
        }

        foreach (static::SUPPORTED_TARGETS as $key => $mappedClass) {
            if (is_a($type, $mappedClass, true)) {
                return $key;
            }
        }

        Log::warning("Unsupported morph target requested: {$type}");

        return $type;
    }
}
