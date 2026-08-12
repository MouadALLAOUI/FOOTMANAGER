<?php

namespace App\Domains\Social\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Models\Follow;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

class FollowService
{
    protected const COUNTER_TARGETS = [
        Team::class,
        Player::class,
        Stadium::class,
    ];

    public function follow(User $user, Model $target): array
    {
        $this->assertFollowable($target);

        if ((int) $target->getKey() > 0) {
            $exists = Follow::query()
                ->where('follower_id', $user->id)
                ->where('followable_type', $target->getMorphClass())
                ->where('followable_id', $target->getKey())
                ->exists();

            if (! $exists) {
                Follow::query()->create([
                    'follower_id' => $user->id,
                    'followable_type' => $target->getMorphClass(),
                    'followable_id' => $target->getKey(),
                ]);
                $this->bumpCounter($target, +1);
            }
        }

        return $this->status($user, $target);
    }

    public function unfollow(User $user, Model $target): array
    {
        $deleted = Follow::query()
            ->where('follower_id', $user->id)
            ->where('followable_type', $target->getMorphClass())
            ->where('followable_id', $target->getKey())
            ->delete();

        if ($deleted) {
            $this->bumpCounter($target, -1);
        }

        return $this->status($user, $target);
    }

    public function isFollowing(User $user, Model $target): bool
    {
        return Follow::query()
            ->where('follower_id', $user->id)
            ->where('followable_type', $target->getMorphClass())
            ->where('followable_id', $target->getKey())
            ->exists();
    }

    public function followers(Model $target, int $perPage = 20): LengthAwarePaginator
    {
        return Follow::query()
            ->with('follower:id,name,role,status')
            ->where('followable_type', $target->getMorphClass())
            ->where('followable_id', $target->getKey())
            ->latest()
            ->paginate($perPage);
    }

    public function following(User $user, ?string $type = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = Follow::query()
            ->with('followable')
            ->where('follower_id', $user->id);

        if ($type) {
            $class = MorphMap::classFor($type);

            if ($class) {
                $query->where('followable_type', (new $class)->getMorphClass());
            }
        }

        return $query->latest()->paginate($perPage);
    }

    public function followersCount(Model $target): int
    {
        return Follow::query()
            ->where('followable_type', $target->getMorphClass())
            ->where('followable_id', $target->getKey())
            ->count();
    }

    public function status(User $user, Model $target): array
    {
        return [
            'following' => $this->isFollowing($user, $target),
            'followers_count' => $this->followersCount($target),
        ];
    }

    protected function assertFollowable(Model $target): void
    {
        if (! in_array($target::class, self::COUNTER_TARGETS, true)) {
            throw new DomainException('هذا الكيان لا يدعم المتابعة.', 422);
        }
    }

    protected function bumpCounter(Model $target, int $delta): void
    {
        if (in_array($target::class, self::COUNTER_TARGETS, true)) {
            $target->increment('followers_count', $delta);
            $target->refresh();
        }
    }
}
