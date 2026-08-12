<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentResultService;
use App\Http\Requests\Committee\StoreMatchEventRequest;
use App\Http\Requests\Committee\UpdateMatchEventRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentMatchEventController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentResultService $results,
    ) {}

    public function index(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $events = MatchEvent::query()
            ->where('match_id', $fixture->match_id)
            ->with(['team', 'player', 'assistPlayer'])
            ->orderBy('minute')
            ->orderBy('id')
            ->get()
            ->map(fn (MatchEvent $event) => $this->eventPayload($event));

        return response()->json(['data' => $events]);
    }

    public function store(StoreMatchEventRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $event = $this->results->addEvent($fixture, $request->validated(), $request->user()->id);

        return response()->json([
            'data' => $this->eventPayload($event),
            'message' => 'تمت إضافة الحدث',
        ], 201);
    }

    public function update(UpdateMatchEventRequest $request, Tournament $tournament, Fixture $fixture, MatchEvent $event): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $event = $this->results->updateEvent($fixture, $event, $request->validated(), $request->user()->id);

        return response()->json([
            'data' => $this->eventPayload($event),
            'message' => 'تم تحديث الحدث',
        ]);
    }

    public function destroy(Request $request, Tournament $tournament, Fixture $fixture, MatchEvent $event): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $this->results->deleteEvent($fixture, $event, $request->user()->id);

        return response()->json(['message' => 'تم حذف الحدث']);
    }

    private function eventPayload(MatchEvent $event): array
    {
        return [
            'id' => $event->id,
            'type' => $event->type?->value,
            'icon' => $event->type?->icon(),
            'minute' => $event->minute,
            'added_time' => $event->added_time,
            'period' => $event->period,
            'description' => $event->description,
            'metadata' => $event->metadata,
            'team_id' => $event->team_id,
            'team' => $event->team ? [
                'id' => $event->team->id,
                'name' => $event->team->name,
            ] : null,
            'player' => $event->player ? [
                'id' => $event->player->id,
                'name' => $event->player->name,
                'number' => $event->player->number,
            ] : null,
            'assist_player' => $event->assistPlayer ? [
                'id' => $event->assistPlayer->id,
                'name' => $event->assistPlayer->name,
                'number' => $event->assistPlayer->number,
            ] : null,
            'created_at' => $event->created_at?->toIso8601String(),
        ];
    }

    private function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $tournament->competition_id !== (int) $fixture->competition_id
            || (int) $tournament->season_id !== (int) $fixture->season_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذه البطولة', 404);
        }
    }
}
