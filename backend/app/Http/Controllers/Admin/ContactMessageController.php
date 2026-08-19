<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Contact\Models\ContactMessage;
use App\Domains\Contact\Resources\ContactMessageResource;
use App\Domains\Contact\Services\ContactService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class ContactMessageController extends Controller
{
    public function __construct(
        private readonly ContactService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = ContactMessage::query()->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return ContactMessageResource::collection($query->get());
    }

    public function show(ContactMessage $message): JsonResponse
    {
        if ($message->status === ContactMessage::STATUS_NEW) {
            $message = $this->service->setStatus($message, ContactMessage::STATUS_READ);
        }

        return response()->json(['data' => new ContactMessageResource($message)]);
    }

    public function updateStatus(Request $request, ContactMessage $message): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(ContactMessage::STATUSES)],
        ]);

        $message = $this->service->setStatus($message, $validated['status']);

        return response()->json(['data' => new ContactMessageResource($message)]);
    }

    public function destroy(ContactMessage $message): Response
    {
        $this->service->deleteMessage($message);

        return response()->noContent();
    }
}
