<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Competition\Models\Fixture;
use Illuminate\Http\Request;

/**
 * Landing page match snapshot (live or next upcoming). Extends the live fixture
 * shape (score + recent events feed) and injects the owning tournament so the
 * landing "Live & Next Upcoming Match" section can link back to the tournament.
 *
 * @mixin Fixture
 */
class TournamentLandingMatchResource extends TournamentLiveFixtureResource
{
    protected ?array $tournamentContext = null;

    public function withTournament(?array $tournament): static
    {
        $this->tournamentContext = $tournament;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        $data['tournament'] = $this->tournamentContext;

        return $data;
    }
}
