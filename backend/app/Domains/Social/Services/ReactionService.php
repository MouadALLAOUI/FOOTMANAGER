<?php

namespace App\Domains\Social\Services;

use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Shared\Support\SocialCache;
use App\Domains\Social\Models\Reaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReactionService
{
    public function react(User $user, Model $target, string $type): array
    {
        if (! in_array($type, Reaction::TYPES, true)) {
            throw new DomainException('نوع تفاعل غير صالح.', 422);
        }

        $reaction = Reaction::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'reactionable_type' => $target->getMorphClass(),
                'reactionable_id' => $target->getKey(),
            ],
            ['type' => $type],
        );

        SocialCache::flushReactions($target->getMorphClass(), (int) $target->getKey());

        return $this->summary($target, $user);
    }

    public function unreact(User $user, Model $target): array
    {
        Reaction::query()
            ->where('user_id', $user->id)
            ->where('reactionable_type', $target->getMorphClass())
            ->where('reactionable_id', $target->getKey())
            ->delete();

        SocialCache::flushReactions($target->getMorphClass(), (int) $target->getKey());

        return $this->summary($target, $user);
    }

    public function summary(Model $target, ?User $user = null): array
    {
        $key = SocialCache::reactions($target->getMorphClass(), (int) $target->getKey());

        $counts = Cache::remember($key, 300, function () use ($target) {
            $rows = Reaction::query()
                ->where('reactionable_type', $target->getMorphClass())
                ->where('reactionable_id', $target->getKey())
                ->select('type', DB::raw('count(*) as total'))
                ->groupBy('type')
                ->pluck('total', 'type');

            $counts = [];
            $total = 0;

            foreach (Reaction::TYPES as $type) {
                $counts[$type] = (int) ($rows[$type] ?? 0);
                $total += $counts[$type];
            }

            return ['counts' => $counts, 'total' => $total];
        });

        $myReaction = null;

        if ($user) {
            $myReaction = Reaction::query()
                ->where('user_id', $user->id)
                ->where('reactionable_type', $target->getMorphClass())
                ->where('reactionable_id', $target->getKey())
                ->value('type');
        }

        return [
            'counts' => $counts['counts'],
            'total' => $counts['total'],
            'my_reaction' => $myReaction,
        ];
    }
}
