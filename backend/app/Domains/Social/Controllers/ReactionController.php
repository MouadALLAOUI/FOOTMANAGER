<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Models\Reaction;
use App\Domains\Social\Resources\ReactionResource;
use App\Domains\Social\Services\ReactionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ReactionController extends Controller
{
    public function __construct(
        protected ReactionService $reactions,
    ) {}

    public function store(Request $request): ReactionResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:comment,activity,announcement',
            'target_id' => 'required|integer',
            'type' => 'required|in:like,love,fire,applause',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        Gate::authorize('create', Reaction::class);

        return new ReactionResource($this->reactions->react($request->user(), $target, $data['type']));
    }

    public function destroy(Request $request): ReactionResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:comment,activity,announcement',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        Gate::authorize('delete', Reaction::class);

        return new ReactionResource($this->reactions->unreact($request->user(), $target));
    }

    public function show(Request $request): ReactionResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:comment,activity,announcement',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new ReactionResource($this->reactions->summary($target, $request->user()));
    }
}
