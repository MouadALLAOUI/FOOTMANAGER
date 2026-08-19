<?php

namespace App\Http\Controllers\Public;

use App\Domains\Contact\Resources\ContactMessageResource;
use App\Domains\Contact\Services\ContactService;
use App\Domains\Shared\Base\Controller;
use App\Http\Requests\Public\StoreContactMessageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicContactController extends Controller
{
    public function __construct(
        private readonly ContactService $service,
    ) {}

    public function contact(): JsonResponse
    {
        return response()->json(['data' => $this->service->contactPayload()]);
    }

    public function storeMessage(StoreContactMessageRequest $request): JsonResponse
    {
        // Honeypot: bots tend to fill hidden fields.
        if ($request->filled('website')) {
            abort(422, 'رسالة غير صالحة');
        }

        $message = $this->service->submitMessage($request->validated(), $request->ip());

        return response()->json(['data' => new ContactMessageResource($message)], 201);
    }
}
