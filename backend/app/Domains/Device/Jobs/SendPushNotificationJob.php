<?php

namespace App\Domains\Device\Jobs;

use App\Domains\Device\Services\DeviceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [5, 15];

    public int $timeout = 30;

    public function __construct(
        public string $token,
        public string $title,
        public string $body,
        public array $data = [],
    ) {}

    public function handle(DeviceService $devices): void
    {
        try {
            $request = Http::acceptJson()->timeout(10);

            if ($accessToken = (string) config('services.expo.access_token')) {
                $request = $request->withToken($accessToken);
            }

            $response = $request->post((string) config('services.expo.push_host'), [
                    'to' => $this->token,
                    'title' => $this->title,
                    'body' => $this->body,
                    'data' => $this->data,
                    'sound' => 'default',
                    'priority' => 'high',
                ]);

            if ($response->failed()) {
                Log::warning('Push notification send failed', [
                    'token' => substr($this->token, 0, 32).'…',
                    'status' => $response->status(),
                    'error' => $response->body(),
                ]);

                // Retryable — Expo was unavailable or rate limited.
                if ($response->status() === 429 || $response->status() >= 500) {
                    $this->release($this->attempts() >= 2 ? 60 : 10);

                    return;
                }

                $this->fail(new \RuntimeException("Expo Push API returned HTTP {$response->status()}"));

                return;
            }

            $ticket = data_get($response->json(), 'data.0');
            $status = is_array($ticket) ? ($ticket['status'] ?? null) : null;

            if ($status === 'error') {
                $detailsError = data_get($ticket, 'details.error');

                Log::warning('Push notification rejected by provider', [
                    'token' => substr($this->token, 0, 32).'…',
                    'message' => $ticket['message'] ?? null,
                    'details' => $detailsError,
                ]);

                // The device is gone (uninstalled / revoked permission) — stop
                // sending to it until it re-registers.
                if ($detailsError === 'DeviceNotRegistered') {
                    $devices->forgetToken($this->token);
                }

                return;
            }

            Log::info('Push notification delivered', [
                'ticket' => is_array($ticket) ? ($ticket['id'] ?? 'ok') : 'ok',
                'title' => $this->title,
            ]);
        } catch (\Throwable $e) {
            Log::error('Push notification send exception', [
                'token' => substr($this->token, 0, 32).'…',
                'error' => $e->getMessage(),
            ]);

            if ($this->attempts() < $this->tries) {
                $this->release(20);
            }
        }
    }
}