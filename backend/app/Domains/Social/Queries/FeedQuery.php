<?php

namespace App\Domains\Social\Queries;

use App\Domains\Player\Models\Player;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Models\Follow;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class FeedQuery
{
    public function base(): Builder
    {
        return Activity::query()->with(['actor', 'subject']);
    }

    public function latest(Builder $query): Builder
    {
        return $query->orderByDesc('created_at');
    }

    public function popular(Builder $query): Builder
    {
        return $query
            ->withCount('reactions')
            ->orderByDesc('reactions_count')
            ->orderByDesc('created_at');
    }

    public function following(Builder $query, User $user): Builder
    {
        $followed = Follow::query()
            ->where('follower_id', $user->id)
            ->whereNotNull('followable_type')
            ->get(['followable_type', 'followable_id'])
            ->groupBy('followable_type')
            ->map(fn ($rows) => $rows->pluck('followable_id')->all());

        if ($followed->isEmpty()) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($followed) {
            foreach ($followed as $type => $ids) {
                $q->orWhere(function (Builder $sub) use ($type, $ids) {
                    $sub->where('subject_type', $type)->whereIn('subject_id', $ids);
                });
            }
        })->orderByDesc('created_at');
    }

    public function nearby(Builder $query, User $user): Builder
    {
        $cities = $this->citiesFor($user);

        if (empty($cities)) {
            return $this->latest($query);
        }

        $teamIds = Team::query()->whereIn('city', $cities)->pluck('id');
        $stadiumIds = Stadium::query()->whereIn('city', $cities)->pluck('id');

        $teamMorph = (new Team)->getMorphClass();
        $stadiumMorph = (new Stadium)->getMorphClass();
        $playerMorph = (new Player)->getMorphClass();

        $playerIds = Player::query()
            ->whereIn('team_id', $teamIds)
            ->pluck('id');

        return $query->where(function (Builder $q) use ($teamMorph, $stadiumMorph, $playerMorph, $teamIds, $stadiumIds, $playerIds) {
            $q->where(function (Builder $s) use ($teamMorph, $teamIds) {
                $s->where('subject_type', $teamMorph)->whereIn('subject_id', $teamIds);
            })
                ->orWhere(function (Builder $s) use ($stadiumMorph, $stadiumIds) {
                    $s->where('subject_type', $stadiumMorph)->whereIn('subject_id', $stadiumIds);
                })
                ->orWhere(function (Builder $s) use ($playerMorph, $playerIds) {
                    $s->where('subject_type', $playerMorph)->whereIn('subject_id', $playerIds);
                });
        })->orderByDesc('created_at');
    }

    protected function citiesFor(User $user): array
    {
        $cities = [];

        if ($user->isManager()) {
            $city = $user->team?->city;
            if ($city) {
                $cities[] = $city;
            }
        }

        $player = $user->rosterPlayer;

        if ($player) {
            if ($player->team?->city) {
                $cities[] = $player->team->city;
            }

            $preferred = $player->playerProfile?->preferred_cities;
            if (is_array($preferred)) {
                $cities = array_merge($cities, array_values($preferred));
            }
        }

        return array_values(array_filter(array_unique($cities)));
    }
}
