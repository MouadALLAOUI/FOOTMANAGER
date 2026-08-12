<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Resources\SearchResource;
use App\Domains\Social\Services\SearchService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(
        protected SearchService $search,
    ) {}

    public function search(Request $request): SearchResource
    {
        return new SearchResource($this->search->search($request, $request->user()));
    }

    public function suggest(Request $request): array
    {
        return $this->search->suggest($request);
    }

    public function recent(Request $request): array
    {
        return [
            'recent_searches' => $this->search->recent($request->user()),
        ];
    }

    public function popular(): array
    {
        return [
            'popular_searches' => $this->search->popular(),
        ];
    }
}
