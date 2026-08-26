<?php

namespace App\Domains\Chat\Controllers;

use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Chat\Resources\ChatMessageResource;
use App\Domains\Chat\Services\MatchChatService;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MatchChatController extends Controller
{
    public function __construct(
        protected MatchChatService $chat,
        protected ReportService $reports,
    ) {}

    public function index(Request $request, FootballMatch $match): AnonymousResourceCollection
    {
        Gate::authorize('chat.view', $match);

        $afterId = $request->filled('after_id') ? (int) $request->query('after_id') : null;

        return ChatMessageResource::collection($this->chat->messages($match, $afterId));
    }

    public function store(Request $request, FootballMatch $match): ChatMessageResource
    {
        Gate::authorize('chat.send', $match);

        $data = $request->validate([
            'message' => 'required|string|min:1|max:1000',
        ]);

        return new ChatMessageResource($this->chat->send($request->user(), $match, $data['message']));
    }

    public function announcement(Request $request, FootballMatch $match): ChatMessageResource
    {
        $data = $request->validate([
            'message' => 'required|string|min:1|max:1000',
        ]);

        return new ChatMessageResource($this->chat->sendAnnouncement($request->user(), $match, $data['message']));
    }

    public function update(Request $request, MatchChatMessage $message): ChatMessageResource
    {
        $data = $request->validate([
            'message' => 'required|string|min:1|max:1000',
        ]);

        Gate::authorize('chat.update', $message);

        return new ChatMessageResource($this->chat->edit($request->user(), $message, $data['message']));
    }

    public function destroy(Request $request, MatchChatMessage $message): JsonResponse
    {
        Gate::authorize('chat.delete', $message);

        $this->chat->delete($request->user(), $message);

        return response()->json(['message' => 'تم حذف الرسالة.']);
    }

    public function pin(Request $request, MatchChatMessage $message): ChatMessageResource
    {
        $match = $message->match;
        Gate::authorize('chat.pin', $match);

        return new ChatMessageResource($this->chat->pin($request->user(), $match, $message));
    }

    public function read(Request $request, FootballMatch $match): JsonResponse
    {
        Gate::authorize('chat.view', $match);

        $data = $request->validate([
            'last_read_message_id' => 'required|integer|min:0',
        ]);

        return response()->json($this->chat->markRead($request->user(), $match, (int) $data['last_read_message_id']));
    }

    public function readStatus(Request $request, FootballMatch $match): JsonResponse
    {
        Gate::authorize('chat.view', $match);

        return response()->json($this->chat->readStatus($request->user(), $match));
    }

    public function mute(Request $request, FootballMatch $match): JsonResponse
    {
        $data = $request->validate([
            'minutes' => 'nullable|integer|min:1|max:10080',
        ]);

        Gate::authorize('chat.mute', $match);

        return response()->json($this->chat->mute($request->user(), $match, (int) ($data['minutes'] ?? 60)));
    }

    public function unmute(Request $request, FootballMatch $match): JsonResponse
    {
        Gate::authorize('chat.view', $match);

        return response()->json($this->chat->unmute($request->user(), $match));
    }

    public function report(Request $request, MatchChatMessage $message): JsonResponse
    {
        Gate::authorize('chat.view', $message->match);

        $data = $request->validate([
            'reason' => 'required|string|max:60',
            'details' => 'nullable|string|max:1000',
        ]);

        $this->reports->report($request->user(), $message, $data['reason'], $data['details'] ?? null);

        return response()->json(['message' => 'تم إرسال البلاغ.']);
    }
}
