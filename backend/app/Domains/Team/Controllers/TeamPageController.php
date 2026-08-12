<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Resources\TeamPageResource;
use App\Domains\Team\Services\TeamPageService;
use Illuminate\Http\Request;

class TeamPageController extends Controller
{
    public function __construct(protected TeamPageService $service) {}

    public function show(Request $request, Team $team): TeamPageResource
    {
        $page = $this->service->page($team, $request->user());

        return new TeamPageResource($page);
    }
}
