<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Resources\EventResource;
use Illuminate\Http\Request;

/**
 * Live match snapshot used by the "live match + activity" section. The fixture
 * is shaped exactly like TournamentFixtureResource but the nested `match`
 * object additionally carries the recent `events` feed, so the frontend can
 * render the in-progress score and its activity without an extra round trip.
 *
 * @mixin Fixture
 */
class TournamentLiveFixtureResource extends TournamentFixtureResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        if ($this->relationLoaded('match') && $this->match) {
            $data['match']['events'] = $this->match->relationLoaded('events')
                ? EventResource::collection($this->match->events)
                : [];
        }

        return $data;
    }
}
