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
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchService
{
    /**
     * Build an Arabic-tolerant regex pattern that normalizes:
     * - All Alifs: [ا, أ, إ, آ, ٱ]
     * - Yaa and Alif Maqsura: [ي, ى, ئ]
     * - Taa Marbuta and Haa: [ه, ة]
     * - Waw variations: [و, ؤ]
     * - Optional definite article "ال" at word start
     * - Stripping diacritics (tashkeel) and tatweel
     */
    public static function buildArabicRegex(string $q): string
    {
        $q = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', trim($q));
        if ($q === '') {
            return '';
        }

        // Split into words to handle multi-word flexible search
        $words = preg_split('/\s+/u', $q, -1, PREG_SPLIT_NO_EMPTY);
        $wordPatterns = [];

        foreach ($words as $w) {
            $chars = mb_str_split($w);
            $pattern = '';

            // Handle optional "ال" prefix
            if (mb_substr($w, 0, 2) === 'ال' || mb_substr($w, 0, 2) === 'أل' || mb_substr($w, 0, 2) === 'إل') {
                $chars = array_slice($chars, 2);
                $pattern = '(ال|أل|إل|آل)?';
            } else {
                $pattern = '(ال|أل|إل|آل)?';
            }

            foreach ($chars as $ch) {
                if (in_array($ch, ['ا', 'أ', 'إ', 'آ', 'ٱ'], true)) {
                    $pattern .= '[اأإآٱ]';
                } elseif (in_array($ch, ['ي', 'ى', 'ئ'], true)) {
                    $pattern .= '[يىئ]';
                } elseif (in_array($ch, ['ه', 'ة'], true)) {
                    $pattern .= '[هة]';
                } elseif (in_array($ch, ['و', 'ؤ'], true)) {
                    $pattern .= '[وؤ]';
                } else {
                    $pattern .= preg_quote($ch, '/');
                }
            }

            if ($pattern !== '') {
                $wordPatterns[] = $pattern;
            }
        }

        return implode('.*', $wordPatterns);
    }

    /**
     * Apply flexible Arabic search across multiple columns.
     */
    protected function applyArabicSearch($query, array $columns, string $q, string $regex): void
    {
        $query->where(function ($sub) use ($columns, $q, $regex) {
            foreach ($columns as $col) {
                $sub->orWhere($col, 'like', "%{$q}%");
                if ($regex !== '') {
                    $sub->orWhereRaw("{$col} REGEXP ?", [$regex]);
                }
            }
        });
    }

    public function search(Request $request, ?User $user = null): array
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(15, max(1, (int) $request->query('limit', 5)));

        if ($q === '') {
            return [];
        }

        $this->record($q, $user);
        $regex = self::buildArabicRegex($q);

        $results = [];

        // 1. Tournaments (البطولات)
        $results['tournaments'] = Tournament::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'location', 'slug'], $q, $regex);
            })
            ->where('status', '!=', 'cancelled')
            ->select(['id', 'name', 'slug', 'location', 'status', 'start_date', 'teams_count', 'logo_path'])
            ->limit($limit)
            ->get();

        // 2. Teams (الفرق - search all teams and their managers in the platform archive)
        $results['teams'] = Team::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'city'], $q, $regex);
                $query->orWhereHas('manager', function ($mq) use ($q, $regex) {
                    $this->applyArabicSearch($mq, ['name', 'phone'], $q, $regex);
                });
            })
            ->with(['manager:id,name,phone'])
            ->select(['id', 'name', 'logo_path', 'logo_url', 'city', 'category', 'followers_count', 'manager_id'])
            ->limit($limit)
            ->get();

        // 3. Stadiums (الملاعب)
        $results['stadiums'] = Stadium::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'city', 'address'], $q, $regex);
            })
            ->where('is_available', true)
            ->select(['id', 'name', 'city', 'type', 'rating', 'reviews_count', 'followers_count', 'cover_image'])
            ->limit($limit)
            ->get();

        // 4. Players (اللاعبون)
        $results['players'] = Player::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'position'], $q, $regex);
            })
            ->active()
            ->with('team:id,name')
            ->select(['id', 'name', 'position', 'team_id', 'user_id', 'followers_count'])
            ->limit($limit)
            ->get();

        // 5. Live Matches (المباريات المباشرة)
        $results['live_matches'] = FootballMatch::query()
            ->live()
            ->where(function ($query) use ($q, $regex) {
                $query->whereHas('homeTeam', fn ($t) => $this->applyArabicSearch($t, ['name'], $q, $regex))
                    ->orWhereHas('awayTeam', fn ($t) => $this->applyArabicSearch($t, ['name'], $q, $regex));
            })
            ->with(['homeTeam:id,name,logo_path,logo_url', 'awayTeam:id,name,logo_path,logo_url'])
            ->limit($limit)
            ->get();

        // 6. Activities & Comments
        $results['activities'] = $q !== ''
            ? Activity::query()
                ->where(function ($query) use ($q, $regex) {
                    $this->applyArabicSearch($query, ['type'], $q, $regex);
                })
                ->latest()
                ->limit($limit)
                ->get()
            : collect();

        $results['reviews'] = Comment::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['body'], $q, $regex);
            })
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

        $regex = self::buildArabicRegex($q);

        $tournaments = Tournament::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'location'], $q, $regex);
            })
            ->where('status', '!=', 'cancelled')
            ->select('id', 'name', 'slug', 'location')
            ->limit(5)
            ->get();

        $teams = Team::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'city'], $q, $regex);
            })
            ->select('id', 'name', 'city')
            ->limit(5)
            ->get();

        $players = Player::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name'], $q, $regex);
            })
            ->active()
            ->select('id', 'name', 'position')
            ->limit(5)
            ->get();

        $stadiums = Stadium::query()
            ->where(function ($query) use ($q, $regex) {
                $this->applyArabicSearch($query, ['name', 'city'], $q, $regex);
            })
            ->select('id', 'name', 'city')
            ->limit(5)
            ->get();

        return [
            'tournaments' => $tournaments,
            'teams' => $teams,
            'players' => $players,
            'stadiums' => $stadiums,
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
