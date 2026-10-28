<?php

namespace App\Http\Controllers\Public;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\MatchReminder;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class MatchReminderController extends Controller
{
    /**
     * Ensure the match_reminders table exists (auto-migrates on deployment if table was missed).
     */
    protected function ensureTableExists(): void
    {
        if (! Schema::hasTable('match_reminders')) {
            try {
                Artisan::call('migrate', ['--force' => true]);
            } catch (\Throwable $migError) {
                Log::error('MatchReminder auto-migration failed: ' . $migError->getMessage());
            }
        }
    }

    /**
     * Store or activate a 12-hour reminder for an upcoming fixture.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $this->ensureTableExists();

            $request->validate([
                'fixture_id' => 'required|integer|exists:fixtures,id',
            ]);

            $user = $request->user();
            if (! $user) {
                return response()->json([
                    'message' => 'يرجى تسجيل الدخول أولاً لتفعيل التذكير.',
                ], 401);
            }

            $fixtureId = (int) $request->integer('fixture_id');

            $fixture = Fixture::with(['homeTeam', 'awayTeam', 'stadium', 'match'])
                ->findOrFail($fixtureId);

            // 1. Verify eligibility: match must be officially scheduled
            $statusVal = $fixture->status instanceof FixtureStatus
                ? $fixture->status->value
                : (string) $fixture->status;

            if ($statusVal !== 'scheduled') {
                return response()->json([
                    'message' => 'لا يمكن تفعيل التذكير لهذه المباراة لأنها غير مجدولة رسمياً حالياً.',
                ], 422);
            }

            if ($fixture->match && in_array($fixture->match->status, [MatchStatus::Finished, MatchStatus::Cancelled, MatchStatus::Postponed], true)) {
                return response()->json([
                    'message' => 'المباراة ملغاة أو منتهية ولا تقبل تفعيل التذكير.',
                ], 422);
            }

            $kickoffAt = $fixture->scheduled_at ?? $fixture->match?->kickoff_at;
            if (! $kickoffAt) {
                return response()->json([
                    'message' => 'توقيت انطلاق المباراة غير محدد بدقة بعد.',
                ], 422);
            }

            $timezone = config('app.timezone', 'Africa/Casablanca');
            $now = Carbon::now($timezone);
            $kickoff = Carbon::parse($kickoffAt, $timezone);

            if ($kickoff->isPast()) {
                return response()->json([
                    'message' => 'المباراة انطلقت أو انتهت بالفعل.',
                ], 422);
            }

            // 2. Calculate reminder_at: 12 hours prior, or 1 hour prior if less than 12 hours left
            $hoursLeft = $now->diffInHours($kickoff, false);
            $minutesLeft = $now->diffInMinutes($kickoff, false);

            if ($hoursLeft >= 12) {
                $reminderAt = (clone $kickoff)->subHours(12);
                $successMsg = 'تم تفعيل التذكير بنجاح! سنقوم بإشعارك قبل 12 ساعة من انطلاق المباراة.';
            } elseif ($minutesLeft > 60) {
                $reminderAt = (clone $kickoff)->subHour();
                $successMsg = 'المباراة متبقي عليها أقل من 12 ساعة! تم ضبط التذكير التلقائي قبل ساعة واحدة من انطلاقها.';
            } else {
                $reminderAt = (clone $now);
                $successMsg = 'المباراة على وشك الانطلاق خلال أقل من ساعة! تم تفعيل التنبيه الفوري.';
            }

            $homeName = $fixture->homeTeam?->name ?? 'فريق أ';
            $awayName = $fixture->awayTeam?->name ?? 'فريق ب';
            $matchTitle = "{$homeName} ضد {$awayName}";
            $tournamentName = $fixture->tournament?->name ?? $fixture->competition?->name ?? 'بطولة كروية';
            $stadiumName = $fixture->stadium?->name ?? 'ملعب القرب';

            // 3. Prevent duplicate reminders (idempotent)
            $existing = MatchReminder::where('user_id', $user->id)
                ->where('fixture_id', $fixture->id)
                ->first();

            if ($existing) {
                if ($existing->status === MatchReminder::STATUS_PENDING) {
                    return response()->json([
                        'message' => 'تم تفعيل التذكير مسبقاً لهذه المباراة.',
                        'data' => $existing,
                    ], 200);
                }

                // Reactivate cancelled or modified reminder
                $existing->update([
                    'match_id' => $fixture->match_id,
                    'match_title' => $matchTitle,
                    'tournament_name' => $tournamentName,
                    'stadium_name' => $stadiumName,
                    'kickoff_at' => $kickoff,
                    'reminder_at' => $reminderAt,
                    'status' => MatchReminder::STATUS_PENDING,
                    'cancelled_at' => null,
                    'error_message' => null,
                ]);

                return response()->json([
                    'message' => $successMsg,
                    'data' => $existing,
                ], 200);
            }

            // 4. Create new persistent reminder
            $reminder = MatchReminder::create([
                'user_id' => $user->id,
                'fixture_id' => $fixture->id,
                'match_id' => $fixture->match_id,
                'match_title' => $matchTitle,
                'tournament_name' => $tournamentName,
                'stadium_name' => $stadiumName,
                'kickoff_at' => $kickoff,
                'reminder_at' => $reminderAt,
                'status' => MatchReminder::STATUS_PENDING,
            ]);

            return response()->json([
                'message' => $successMsg,
                'data' => $reminder,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            throw $ve;
        } catch (\Throwable $e) {
            Log::error('MatchReminderController::store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'تعذر تفعيل التذكير في الوقت الحالي: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel an active reminder for the authenticated user.
     */
    public function cancel(Request $request): JsonResponse
    {
        try {
            $this->ensureTableExists();

            $request->validate([
                'fixture_id' => 'required|integer',
            ]);

            $user = $request->user();
            if (! $user) {
                return response()->json(['message' => 'غير مصرح'], 401);
            }

            $fixtureId = (int) $request->integer('fixture_id');

            $reminder = MatchReminder::where('user_id', $user->id)
                ->where('fixture_id', $fixtureId)
                ->where('status', MatchReminder::STATUS_PENDING)
                ->first();

            if ($reminder) {
                $reminder->cancel();

                return response()->json([
                    'message' => 'تم إلغاء التذكير بنجاح.',
                    'fixture_id' => $fixtureId,
                ], 200);
            }

            return response()->json([
                'message' => 'لا يوجد تذكير نشط لهذه المباراة.',
                'fixture_id' => $fixtureId,
            ], 200);
        } catch (\Throwable $e) {
            Log::error('MatchReminderController::cancel error: ' . $e->getMessage());

            return response()->json([
                'message' => 'تعذر إلغاء التذكير في الوقت الحالي.',
            ], 500);
        }
    }

    /**
     * List all active fixture IDs that the authenticated user has pending reminders for.
     */
    public function active(Request $request): JsonResponse
    {
        try {
            $this->ensureTableExists();

            $user = $request->user();
            if (! $user) {
                return response()->json(['active_fixture_ids' => []]);
            }

            $activeFixtureIds = MatchReminder::where('user_id', $user->id)
                ->where('status', MatchReminder::STATUS_PENDING)
                ->pluck('fixture_id')
                ->filter()
                ->values();

            return response()->json([
                'active_fixture_ids' => $activeFixtureIds,
            ]);
        } catch (\Throwable $e) {
            Log::error('MatchReminderController::active error: ' . $e->getMessage());

            return response()->json([
                'active_fixture_ids' => [],
            ]);
        }
    }
}
