<?php

namespace App\Console\Commands;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\MatchReminder;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Notification\Services\WebPushService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendUpcomingMatchRemindersCommand extends Command
{
    protected $signature = 'matches:send-reminders {--force : Process pending reminders immediately for verification}';

    protected $description = 'Find due 12-hour match reminders and deliver notifications reliably to users.';

    public function handle(): int
    {
        $timezone = config('app.timezone', 'Africa/Casablanca');
        $now = Carbon::now($timezone);
        $force = (bool) $this->option('force');

        $this->info("Checking for due match reminders at {$now->toDateTimeString()} ({$timezone})...");

        // Retrieve pending reminders that are due
        $query = MatchReminder::query()
            ->where('status', MatchReminder::STATUS_PENDING);

        if (! $force) {
            $query->where('reminder_at', '<=', $now);
        }

        $reminders = $query->with([
            'user',
            'fixture.homeTeam',
            'fixture.awayTeam',
            'fixture.stadium',
            'fixture.match',
        ])->get();

        if ($reminders->isEmpty()) {
            $this->info('No due match reminders found.');

            return self::SUCCESS;
        }

        $sentCount = 0;
        $cancelledCount = 0;
        $rescheduledCount = 0;
        $expiredCount = 0;

        foreach ($reminders as $reminder) {
            DB::transaction(function () use (
                $reminder,
                $now,
                $timezone,
                &$sentCount,
                &$cancelledCount,
                &$rescheduledCount,
                &$expiredCount
            ) {
                // Lock the row to prevent concurrent duplicate delivery
                $locked = MatchReminder::where('id', $reminder->id)
                    ->where('status', MatchReminder::STATUS_PENDING)
                    ->lockForUpdate()
                    ->first();

                if (! $locked) {
                    return;
                }

                $fixture = $locked->fixture;

                // 1. If fixture was deleted or missing
                if (! $fixture) {
                    $locked->update([
                        'status' => MatchReminder::STATUS_EXPIRED,
                        'error_message' => 'Fixture record no longer exists.',
                    ]);
                    $expiredCount++;

                    return;
                }

                // 2. If match was cancelled
                if ($fixture->status === FixtureStatus::Cancelled || $fixture->match?->status === MatchStatus::Cancelled) {
                    $locked->update([
                        'status' => MatchReminder::STATUS_CANCELLED,
                        'cancelled_at' => $now,
                        'error_message' => 'المباراة تم إلغاؤها من قبل اللجنة أو المنظم.',
                    ]);
                    $cancelledCount++;

                    return;
                }

                // 3. Check for rescheduling
                $currentKickoff = $fixture->scheduled_at ?? $fixture->match?->kickoff_at;
                if ($currentKickoff) {
                    $currentKickoffCarbon = Carbon::parse($currentKickoff, $timezone);
                    if ($currentKickoffCarbon->toDateTimeString() !== $locked->kickoff_at->toDateTimeString()) {
                        // Match was rescheduled: recalculate reminder_at = kickoff - 12 hours
                        $newReminderAt = (clone $currentKickoffCarbon)->subHours(12);

                        if ($newReminderAt->greaterThan($now)) {
                            // Leave pending for the new kickoff reminder time
                            $locked->update([
                                'kickoff_at' => $currentKickoffCarbon,
                                'reminder_at' => $newReminderAt,
                                'error_message' => 'تم تأجيل/تعديل موعد المباراة، وحُدّث التذكير ليتوافق مع الموعد الجديد.',
                            ]);
                            $rescheduledCount++;

                            return;
                        }
                    }
                }

                // 4. Check if match already started or played
                if ($fixture->status === FixtureStatus::Played || $fixture->match?->status === MatchStatus::Finished) {
                    $locked->update([
                        'status' => MatchReminder::STATUS_EXPIRED,
                        'error_message' => 'المباراة انتهت بالفعل.',
                    ]);
                    $expiredCount++;

                    return;
                }

                // 5. Deliver notification through established channels
                $homeName = $fixture->homeTeam?->name ?? 'فريق أ';
                $awayName = $fixture->awayTeam?->name ?? 'فريق ب';
                $stadiumName = $locked->stadium_name ?? $fixture->stadium?->name ?? 'ملعب القرب';
                $timeStr = $locked->kickoff_at->format('H:i');
                $dateStr = $locked->kickoff_at->format('Y-m-d');

                $title = '⏰ تذكير: مباراة مرتقبة بعد 12 ساعة';
                $body = "مباراة {$homeName} ضد {$awayName} ستنطلق في تمام الساعة {$timeStr} على أرضية {$stadiumName}.";

                $actionUrl = '/matches';
                $tournament = $fixture->tournament ?? $fixture->competition;
                if ($tournament && ! empty($tournament->slug)) {
                    $actionUrl = "/tournaments/{$tournament->slug}/matches/{$fixture->id}";
                }

                // Channel 1: In-App notification + Broadcast
                NotificationService::push(
                    userId: $locked->user_id,
                    type: 'upcoming_match_reminder',
                    title: $title,
                    body: $body,
                    data: [
                        'reminder_id' => $locked->id,
                        'fixture_id' => $locked->fixture_id,
                        'match_id' => $locked->match_id,
                        'kickoff_at' => $locked->kickoff_at->toDateTimeString(),
                    ],
                    actionUrl: $actionUrl,
                    important: true,
                );

                // Channel 2: Browser Web Push (VAPID)
                if ($locked->user) {
                    WebPushService::sendToUser(
                        user: $locked->user,
                        title: $title,
                        body: $body,
                        url: $actionUrl,
                        payload: [
                            'type' => 'upcoming_match_reminder',
                            'fixture_id' => $locked->fixture_id,
                        ],
                    );
                }

                // Mark as successfully sent
                $locked->update([
                    'status' => MatchReminder::STATUS_SENT,
                    'sent_at' => $now,
                    'error_message' => null,
                ]);

                $sentCount++;
            });
        }

        $this->info("Completed: {$sentCount} sent, {$rescheduledCount} rescheduled, {$cancelledCount} cancelled, {$expiredCount} expired.");

        return self::SUCCESS;
    }
}
