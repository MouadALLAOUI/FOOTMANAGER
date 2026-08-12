<?php

namespace App\Domains\Notification\Services;

use App\Domains\Notification\Models\NotificationPreference;
use App\Models\User;

class NotificationPreferenceService
{
    public function get(User $user): array
    {
        $rows = NotificationPreference::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('type');

        $types = NotificationService::TYPES;

        $preferences = [];

        foreach ($types as $type) {
            $preferences[$type] = [
                'database_enabled' => $this->enabled($rows, $type, 'database'),
                'email_enabled' => $this->enabled($rows, $type, 'email'),
                'push_enabled' => $this->enabled($rows, $type, 'push'),
                'sms_enabled' => $this->enabled($rows, $type, 'sms'),
            ];
        }

        return $preferences;
    }

    public function update(User $user, array $data): array
    {
        $allowed = [
            'database_enabled',
            'email_enabled',
            'push_enabled',
            'sms_enabled',
        ];

        foreach ($data as $type => $channels) {
            if (! in_array($type, array_merge(['*'], NotificationService::TYPES), true) || ! is_array($channels)) {
                continue;
            }

            $payload = [];

            foreach ($allowed as $channel) {
                if (array_key_exists($channel, $channels)) {
                    $payload[$channel] = (bool) $channels[$channel];
                }
            }

            if (empty($payload)) {
                continue;
            }

            NotificationPreference::query()->updateOrCreate(
                ['user_id' => $user->id, 'type' => $type],
                $payload,
            );
        }

        return $this->get($user);
    }

    protected function enabled($rows, string $type, string $channel): bool
    {
        if (isset($rows[$type])) {
            return (bool) $rows[$type]->getAttribute($channel.'_enabled');
        }

        if (isset($rows['*'])) {
            return (bool) $rows['*']->getAttribute($channel.'_enabled');
        }

        return true;
    }
}
