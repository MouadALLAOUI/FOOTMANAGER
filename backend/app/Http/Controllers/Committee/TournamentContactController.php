<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentContactMessage;
use App\Domains\Tournament\Resources\TournamentContactMessageResource;
use App\Domains\Tournament\Services\TournamentContactService;
use App\Http\Requests\Committee\UpdateTournamentContactRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class TournamentContactController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentContactService $service,
    ) {}

    public function showContact(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->service->contactPayload($tournament)]);
    }

    public function updateContact(UpdateTournamentContactRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $tournament = $this->service->updateContact($tournament, $request->validated());

        return response()->json(['data' => $this->service->contactPayload($tournament)]);
    }

    public function messages(Request $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $query = $tournament->contactMessages()->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return TournamentContactMessageResource::collection($query->get());
    }

    public function showMessage(Tournament $tournament, TournamentContactMessage $message): JsonResponse
    {
        $this->authorize('view', $tournament);

        if ($message->status === TournamentContactMessage::STATUS_NEW) {
            $message = $this->service->setStatus($tournament, $message, TournamentContactMessage::STATUS_READ);
        }

        return response()->json(['data' => new TournamentContactMessageResource($message)]);
    }

    public function updateMessageStatus(Request $request, Tournament $tournament, TournamentContactMessage $message): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'status' => ['required', Rule::in(TournamentContactMessage::STATUSES)],
        ]);

        $message = $this->service->setStatus($tournament, $message, $validated['status']);

        return response()->json(['data' => new TournamentContactMessageResource($message)]);
    }

    public function destroyMessage(Tournament $tournament, TournamentContactMessage $message): Response
    {
        $this->authorize('manage', $tournament);

        $this->service->deleteMessage($tournament, $message);

        return response()->noContent();
    }
}
