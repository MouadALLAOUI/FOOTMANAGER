<?php

namespace App\Domains\Social\Services;

use App\Domains\Shared\Support\SocialCache;
use App\Domains\Social\Events\ActivityCreated;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Models\Reaction;
use App\Domains\Social\Queries\FeedQuery;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

class ActivityService
{
    public function __construct(
        protected FeedQuery $query,
    ) {}

    public function record(string $type, ?Model $actor, ?Model $subject, array $data = [], ?string $imageUrl = null): Activity
    {
        $activity = Activity::query()->create([
            'type' => $type,
            'actor_type' => $actor?->getMorphClass(),
            'actor_id' => $actor?->getKey(),
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'data' => $data,
            'image_url' => $imageUrl,
        ]);

        ActivityCreated::dispatch($activity);
        SocialCache::flushFeed();

        return $activity;
    }

    public function feed(Request $request, ?User $user = null): LengthAwarePaginator
    {
        $filter = $request->query('filter', 'all');

        $query = $this->query->base();

        if ($filter === 'following' && $user) {
            $query = $this->query->following($query, $user);
        } elseif ($filter === 'nearby' && $user) {
            $query = $this->query->nearby($query, $user);
        } elseif ($filter === 'popular') {
            $query = $this->query->popular($query);

            $perPage = min(50, max(1, (int) $request->query('per_page', 20)));
            $page = max(1, (int) $request->query('page', 1));

            return Cache::remember(
                SocialCache::feedPopular().":{$page}",
                300,
                fn () => $query->paginate($perPage)->through(fn (Activity $a) => $this->decorate($a, $user)),
            );
        } else {
            $query = $this->query->latest($query);
        }

        $perPage = min(50, max(1, (int) $request->query('per_page', 20)));

        return $query->paginate($perPage)->through(fn (Activity $a) => $this->decorate($a, $user));
    }

    protected function decorate(Activity $activity, ?User $user): Activity
    {
        $activity->loadMissing('actor', 'subject');

        if ($user) {
            $activity->my_reaction = Reaction::query()
                ->where('user_id', $user->id)
                ->where('reactionable_type', $activity->getMorphClass())
                ->where('reactionable_id', $activity->id)
                ->value('type');
        }

        return $activity;
    }
}
