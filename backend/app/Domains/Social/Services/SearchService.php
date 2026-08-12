<?php

namespace App\Domains\Social\Services;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\SocialCache;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Models\Comment;
use App\Domains\Social\Models\SearchHistory;
use App\Domains\Social\Models\SearchTerm;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchService
{
    public function search(Request $request, ?User $user = null): array
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(10, max(1, (int) $request->query('limit', 5)));

        if ($q === '') {
            return [];
        }

        $this->record($q, $user);

        $results = [];

        $results['teams'] = Team::query()
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")->orWhere('city', 'like', "%{$q}%");
            })
            ->whereHas('manager', fn ($query) => $query->where('status', 'approved'))
            ->select(['id', 'name', 'logo_path', 'logo_url', 'city', 'category', 'followers_count'])
            ->limit($limit)
            ->get();

        $results['players'] = Player::query()
            ->where('name', 'like', "%{$q}%")
            ->active()
            ->with('team:id,name')
            ->select(['id', 'name', 'position', 'team_id', 'user_id', 'followers_count'])
            ->limit($limit)
            ->get();

        $results['stadiums'] = Stadium::query()
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")->orWhere('city', 'like', "%{$q}%");
            })
            ->where('is_available', true)
            ->where('is_open', true)
            ->select(['id', 'name', 'city', 'type', 'rating', 'reviews_count', 'followers_count', 'cover_image'])
            ->limit($limit)
            ->get();

        $results['live_matches'] = FootballMatch::query()
            ->live()
            ->where(function ($query) use ($q) {
                $query->whereHas('homeTeam', fn ($t) => $t->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('awayTeam', fn ($t) => $t->where('name', 'like', "%{$q}%"));
            })
            ->with(['homeTeam:id,name,logo_path,logo_url', 'awayTeam:id,name,logo_path,logo_url'])
            ->limit($limit)
            ->get();

        $results['activities'] = $q !== ''
            ? Activity::query()
                ->where('type', 'like', "%{$q}%")
                ->latest()
                ->limit($limit)
                ->get()
            : collect();

        $results['reviews'] = Comment::query()
            ->where('body', 'like', "%{$q}%")
            ->where('status', 'active')
            ->latest()
            ->limit($limit)
            ->get();

        return $results;
    }

    public function suggest(Request $request): array
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '') {
            return [];
        }

        return [
            'teams' => Team::query()->where('name', 'like', "%{$q}%")->select('id', 'name')->limit(5)->get(),
            'players' => Player::query()->where('name', 'like', "%{$q}%")->active()->select('id', 'name')->limit(5)->get(),
            'stadiums' => Stadium::query()->where('name', 'like', "%{$q}%")->select('id', 'name')->limit(5)->get(),
        ];
    }

    public function recent(User $user, int $limit = 10): array
    {
        return SearchHistory::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit($limit)
            ->pluck('query')
            ->unique()
            ->values()
            ->all();
    }

    public function popular(int $limit = 10): array
    {
        return Cache::remember(SocialCache::popularSearches(), 300, function () use ($limit) {
            return SearchTerm::query()
                ->orderByDesc('count')
                ->limit($limit)
                ->pluck('term')
                ->all();
        });
    }

    protected function record(string $q, ?User $user): void
    {
        $term = mb_strtolower(mb_substr($q, 0, 191));

        SearchTerm::query()->updateOrCreate(
            ['term' => $term],
        )->increment('count');

        if ($user) {
            SearchHistory::query()->create([
                'user_id' => $user->id,
                'query' => mb_substr($q, 0, 191),
            ]);
        }
    }
}
