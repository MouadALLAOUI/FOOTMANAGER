<?php

namespace App\Http\Controllers\Public;

use App\Domains\Match\Services\PublicLiveMatchService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

class PublicLiveMatchPageController extends Controller
{
    public function __construct(
        private readonly PublicLiveMatchService $liveService,
    ) {}

    /**
     * Public, read-only Live Match page.
     * Accessible without login; includes noindex directive.
     */
    public function show(Request $request, string $token): View
    {
        try {
            $match = $this->liveService->findByToken($token);
        } catch (ModelNotFoundException) {
            abort(404, 'المباراة غير موجودة أو الرابط غير صالح');
        }

        $data = $this->liveService->getMatchData($match);

        return view('live-match', [
            'match' => $data['match'],
            'events' => $data['events'],
            'lineup' => $data['lineup'] ?? null,
            'last_event_id' => $data['last_event_id'],
            'server_time' => $data['server_time'],
            'public_token' => $token,
        ]);
    }
}
