<?php

namespace App\Domains\Notification\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Notification\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    /**
     * Expose the VAPID public key for the browser to subscribe with.
     * Public — the private key never leaves the backend.
     */
    public function publicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => (string) config('webpush.vapid.public_key'),
        ]);
    }

    /**
     * List the caller's own web push subscriptions (any role).
     */
    public function index(Request $request): JsonResponse
    {
        $subscriptions = $request->user()->pushSubscriptions()
            ->orderByDesc('updated_at')
            ->get(['id', 'endpoint', 'created_at', 'updated_at']);

        return response()->json([
            'subscriptions' => $subscriptions->map(fn ($s) => [
                'id' => $s->id,
                'endpoint' => $s->endpoint,
                'created_at' => $s->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Store (or refresh) a web push subscription for the authenticated user.
     * Any authenticated user, any role — this is the generic subscribe endpoint.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:1024'],
            'keys.p256dh' => ['sometimes', 'nullable', 'string'],
            'keys.auth' => ['sometimes', 'nullable', 'string'],
            'content_encoding' => ['sometimes', 'nullable', 'string', 'in:aes128gcm,aesgcm'],
        ]);

        $endpoint = trim($data['endpoint']);
        $publicKey = $data['keys']['p256dh'] ?? $data['public_key'] ?? null;
        $authToken = $data['keys']['auth'] ?? $data['auth_token'] ?? null;
        $contentEncoding = $data['content_encoding'] ?? null;

        if ($endpoint === '' || ! str_starts_with($endpoint, 'https://')) {
            return response()->json(['message' => 'زيادة endpoint غير صالحة'], 422);
        }

        $subscription = $request->user()->updatePushSubscription(
            $endpoint,
            $publicKey,
            $authToken,
            $contentEncoding,
        );

        return response()->json([
            'message' => 'تم تفعيل الإشعارات',
            'subscription' => [
                'id' => $subscription->id,
                'endpoint' => $subscription->endpoint,
            ],
        ], 201);
    }

    /**
     * Remove a web push subscription by id (only the owner can remove it).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $removed = $request->user()->pushSubscriptions()
            ->where('id', $id)
            ->delete();

        return response()->json([
            'message' => $removed ? 'تم إيقاف الإشعارات' : 'غير موجود',
        ], $removed ? 200 : 404);
    }

    /**
     * Remove a subscription by endpoint (used when the browser unsubscribes).
     */
    public function destroyByEndpoint(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:1024'],
        ]);

        $removed = $request->user()->pushSubscriptions()
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return response()->json([
            'message' => $removed ? 'تم إيقاف الإشعارات' : 'غير موجود',
            'removed' => $removed > 0,
        ]);
    }

    /**
     * Send a test push to the caller's own browser, SYNCHRONOUSLY, so the user
     * can confirm notifications are working right now (any role).
     */
    public function test(Request $request): JsonResponse
    {
        $subscriptions = $request->user()->pushSubscriptions()->count();

        if ($subscriptions === 0) {
            return response()->json([
                'message' => 'لا يوجد أي اشتراك إشعارات مسجّل. فعّل الإشعارات أولاً.',
                'sent' => false,
                'reports' => [],
            ], 422);
        }

        $reports = WebPushService::sendToUserNow(
            $request->user(),
            'إشعار تجريبي',
            'إذا كنت ترى هذه الرسالة فإشعارات المتصفح تعمل بشكل صحيح.',
            '/dashboard',
        );

        $failed = count(array_filter($reports, fn ($r) => $r['status'] === 'failed'));

        return response()->json([
            'message' => $failed === 0 ? 'أُرسل الإشعار التجريبي بنجاح' : 'تعذر إرسال الإشعار التجريبي',
            'sent' => $failed === 0 && count($reports) > 0,
            'reports' => $reports,
        ]);
    }
}
