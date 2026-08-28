<?php

namespace App\Domains\Device\Services;

use App\Domains\Device\Jobs\SendPushNotificationJob;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    public function __construct(
        private readonly DeviceService $devices,
    ) {}

    /**
     * Fan a single message out to every registered device of a user.
     *
     * Delivery is delegated to the queue so the caller is never blocked, and a
     * delivery failure is logged (never thrown) so business flows proceed.
     */
    public function sendToUser(int $userId, string $title, string $body, array $data = []): void
    {
        $this->sendToTokens($this->devices->tokensForUser($userId), $title, $body, $data);
    }

    /**
     * Send to an explicit list of push tokens.
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): void
    {
        foreach (array_values(array_unique(array_filter($tokens))) as $token) {
            if ($this->looksLikePushToken($token)) {
                SendPushNotificationJob::dispatch($token, $title, $body, $data);
            } else {
                Log::warning('Push notification skipped — invalid push token', [
                    'token' => substr((string) $token, 0, 32).'…',
                ]);
            }
        }
    }

    private function looksLikePushToken(mixed $token): bool
    {
        return is_string($token) && str_starts_with($token, 'ExponentPushToken[');
    }
}