<?php

namespace App\Domains\Shared\Controllers;

use App\Domains\Leaderboard\Services\CommunityStatsService;
use App\Domains\Match\Queries\LiveMatchQuery;
use App\Domains\Match\Queries\MatchFeedQuery;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Resources\HomeResource;
use App\Domains\Stadium\Queries\StadiumQuery;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class HomeController extends Controller
{
    public function __construct(private CommunityStatsService $statsService) {}

    public function index(): HomeResource
    {
        $base = Cache::remember('api.v1.home.base', now()->addMinutes(10), function () {
            $announcement = Setting::get('announcement_enabled', false)
                ? [
                    'text' => Setting::get('announcement_text', ''),
                    'type' => Setting::get('announcement_type', 'info'),
                ]
                : null;

            return [
                'platform' => [
                    'name' => Setting::get('platform_name', 'أجي نقصرو'),
                    'tagline' => Setting::get('platform_tagline', ''),
                    'contact_email' => Setting::get('contact_email', ''),
                    'contact_phone' => Setting::get('contact_phone', ''),
                    'whatsapp_number' => Setting::get('whatsapp_number', ''),
                    'facebook_url' => Setting::get('facebook_url', ''),
                    'instagram_url' => Setting::get('instagram_url', ''),
                ],
                'announcement' => $announcement,
                'stats' => $this->statsService->stats(),
            ];
        });

        $base['live_matches_count'] = LiveMatchQuery::base()->count();
        $base['top_stadiums'] = StadiumQuery::base()
            ->orderByDesc('rating')
            ->orderByDesc('reviews_count')
            ->limit(6)
            ->get();
        $base['latest_matches'] = MatchFeedQuery::base()->limit(4)->get();

        return new HomeResource($base);
    }
}
