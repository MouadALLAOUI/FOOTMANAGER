<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Resources\ActivityFeedResource;
use App\Domains\Social\Services\ActivityService;
use Illuminate\Http\Request;

class FeedController extends Controller
{
    public function __construct(
        protected ActivityService $activities,
    ) {}

    public function index(Request $request)
    {
        return ActivityFeedResource::collection(
            $this->activities->feed($request, $request->user()),
        );
    }
}
