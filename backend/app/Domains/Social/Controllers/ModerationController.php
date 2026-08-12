<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Models\Comment;
use App\Domains\Social\Models\Report;
use App\Domains\Social\Services\ReportService;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

class ModerationController extends Controller
{
    public function __construct(
        protected ReportService $reports,
    ) {}

    public function reports(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('moderate', Report::class);

        $status = $request->query('status', 'pending');

        $items = Report::query()
            ->with(['reporter:id,name', 'reportable'])
            ->when(in_array($status, [Report::STATUS_PENDING, Report::STATUS_REVIEWED, Report::STATUS_RESOLVED, Report::STATUS_DISMISSED], true),
                fn (Builder $q) => $q->where('status', $status))
            ->latest()
            ->paginate(20);

        return JsonResource::collection($items->through(fn (Report $report) => [
            'id' => $report->id,
            'reason' => $report->reason,
            'details' => $report->details,
            'status' => $report->status,
            'reporter' => $report->reporter ? ['id' => $report->reporter->id, 'name' => $report->reporter->name] : null,
            'reportable' => $report->reportable ? [
                'type' => $report->reportable->getMorphClass(),
                'id' => $report->reportable->getKey(),
                'summary' => $report->reportable->getAttribute('body') ?? $report->reportable->getAttribute('message') ?? null,
            ] : null,
            'moderated_at' => $report->moderated_at?->toIso8601String(),
            'created_at' => $report->created_at?->toIso8601String(),
        ]));
    }

    public function hidden(Request $request): JsonResponse
    {
        Gate::authorize('moderate', Report::class);

        $hideable = [
            Comment::class => ['key' => 'comment', 'summary' => 'body', 'author' => 'user'],
            MatchChatMessage::class => ['key' => 'chat_message', 'summary' => 'message', 'author' => 'user'],
            PlayerReview::class => ['key' => 'player_review', 'summary' => 'comment', 'author' => 'reviewer'],
            StadiumReview::class => ['key' => 'stadium_review', 'summary' => 'comment', 'author' => 'user'],
        ];

        $search = $request->query('search');

        $items = collect();

        foreach ($hideable as $class => $cfg) {
            $query = $class::query()
                ->with($cfg['author'].':id,name')
                ->where('status', 'hidden');

            if ($request->filled('search')) {
                $query->where($cfg['summary'], 'like', "%{$search}%");
            }

            foreach ($query->latest()->get() as $model) {
                $author = $model->getRelation($cfg['author']);

                $items->push([
                    'type' => $cfg['key'],
                    'id' => $model->getKey(),
                    'summary' => $model->getAttribute($cfg['summary']),
                    'author' => $author
                        ? ['id' => $author->getKey(), 'name' => $author->getAttribute('name')]
                        : null,
                    'hidden_at' => $model->updated_at?->toIso8601String(),
                ]);
            }
        }

        $items = $items->sortByDesc('hidden_at')->values();

        $total = $items->count();
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));
        $page = max(1, (int) $request->query('page', 1));

        return response()->json([
            'items' => $items->forPage($page, $perPage)->values(),
            'pagination' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function resolve(Request $request, Report $report): JsonResponse
    {
        Gate::authorize('moderate', Report::class);

        $data = $request->validate([
            'status' => 'required|in:reviewed,resolved,dismissed',
        ]);

        $this->reports->resolve($request->user(), $report, $data['status']);

        return response()->json(['message' => 'تم تحديث حالة البلاغ.']);
    }

    public function hide(Request $request, string $targetType, int $targetId): JsonResponse
    {
        Gate::authorize('moderate', Report::class);

        $target = MorphMap::resolve($targetType, $targetId);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        $this->reports->hideContent($request->user(), $target);

        return response()->json(['message' => 'تم إخفاء المحتوى.']);
    }

    public function unhide(Request $request, string $targetType, int $targetId): JsonResponse
    {
        Gate::authorize('moderate', Report::class);

        $target = MorphMap::resolve($targetType, $targetId);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        $this->reports->unhideContent($request->user(), $target);

        return response()->json(['message' => 'تم إظهار المحتوى.']);
    }

    public function block(Request $request, User $user): JsonResponse
    {
        Gate::authorize('moderate', Report::class);

        $user->update(['status' => 'blocked']);
        $user->revokeTokens();

        return response()->json(['message' => 'تم حظر المستخدم.']);
    }

    public function unblock(Request $request, User $user): JsonResponse
    {
        Gate::authorize('moderate', Report::class);

        $user->update(['status' => 'approved']);

        return response()->json(['message' => 'تم فك الحظر عن المستخدم.']);
    }
}
