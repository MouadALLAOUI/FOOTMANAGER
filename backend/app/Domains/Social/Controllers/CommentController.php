<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Models\Comment;
use App\Domains\Social\Resources\CommentResource;
use App\Domains\Social\Resources\ReplyResource;
use App\Domains\Social\Services\CommentService;
use App\Domains\Social\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    public function __construct(
        protected CommentService $comments,
        protected ReportService $reports,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'commentable_type' => 'required|in:team,player,stadium,match',
            'commentable_id' => 'required|integer',
            'sort' => 'nullable|in:newest,oldest,most_liked',
        ]);

        $target = MorphMap::resolve($data['commentable_type'], (int) $data['commentable_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return CommentResource::collection(
            $this->comments->list($target, $data['sort'] ?? 'newest', (int) $request->query('page', 1), 15, $request->user()),
        );
    }

    public function store(Request $request): CommentResource
    {
        $data = $request->validate([
            'commentable_type' => 'required|in:team,player,stadium,match',
            'commentable_id' => 'required|integer',
            'body' => 'required|string|min:1|max:1000',
            'parent_id' => 'nullable|integer|exists:comments,id',
        ]);

        $target = MorphMap::resolve($data['commentable_type'], (int) $data['commentable_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        Gate::authorize('create', Comment::class);

        $comment = $this->comments->create($request->user(), $target, $data);

        return new CommentResource($comment);
    }

    public function reply(Request $request, Comment $comment): CommentResource
    {
        $data = $request->validate([
            'body' => 'required|string|min:1|max:1000',
        ]);

        Gate::authorize('create', Comment::class);

        return new ReplyResource($this->comments->reply($request->user(), $comment, $data['body']));
    }

    public function replies(Comment $comment): AnonymousResourceCollection
    {
        return ReplyResource::collection(
            $comment->replies()->with('user:id,name,role')->withCount('likes')->paginate(10),
        );
    }

    public function update(Request $request, Comment $comment): CommentResource
    {
        $data = $request->validate([
            'body' => 'required|string|min:1|max:1000',
        ]);

        Gate::authorize('update', $comment);

        return new CommentResource($this->comments->update($request->user(), $comment, $data['body']));
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        Gate::authorize('delete', $comment);

        $this->comments->delete($request->user(), $comment);

        return response()->json(['message' => 'تم حذف التعليق.']);
    }

    public function like(Request $request, Comment $comment): CommentResource
    {
        Gate::authorize('like', $comment);

        return new CommentResource($this->comments->like($request->user(), $comment));
    }

    public function pin(Request $request, Comment $comment): CommentResource
    {
        Gate::authorize('pin', $comment);

        return new CommentResource($this->comments->pin($request->user(), $comment));
    }

    public function report(Request $request, Comment $comment): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|max:60',
            'details' => 'nullable|string|max:1000',
        ]);

        Gate::authorize('report', $comment);

        $this->reports->report($request->user(), $comment, $data['reason'], $data['details'] ?? null);

        return response()->json(['message' => 'تم إرسال البلاغ.']);
    }
}
