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

class MatchReminderController extends Controller
{
    /**
     * Store or activate a 12-hour reminder for an upcoming fixture.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'fixture_id' => 'required|integer|exists:fixtures,id',
        ]);

        $user = $request->user();
        $fixtureId = (int) $request->integer('fixture_id');

        $fixture = Fixture::with(['homeTeam', 'awayTeam', 'stadium', 'match'])
            ->findOrFail($fixtureId);

        // 1. Verify eligibility: match must be officially scheduled
        if ($fixture->status !== FixtureStatus::Scheduled) {
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

        // 2. Calculate reminder_at: kickoff_at - 12 hours
        $reminderAt = (clone $kickoff)->subHours(12);

        // If reminder time is already in the past, do not schedule a past notification
        if ($reminderAt->lessThanOrEqualTo($now)) {
            return response()->json([
                'message' => 'المباراة ستنطلق في أقل من 12 ساعة، والتذكير التلقائي يتاح للمباريات المتبقي على انطلاقها أكثر من 12 ساعة.',
                'too_late' => true,
            ], 422);
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
                'message' => 'تم تفعيل التذكير بنجاح. سنقوم بتنبيهك قبل 12 ساعة من انطلاق المباراة.',
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
            'message' => 'تم تفعيل التذكير بنجاح. سنقوم بتنبيهك قبل 12 ساعة من انطلاق المباراة.',
            'data' => $reminder,
        ], 201);
    }

    /**
     * Cancel an active reminder for the authenticated user.
     */
    public function cancel(Request $request): JsonResponse
    {
        $request->validate([
            'fixture_id' => 'required|integer',
        ]);

        $user = $request->user();
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
    }

    /**
     * List all active fixture IDs that the authenticated user has pending reminders for.
     */
    public function active(Request $request): JsonResponse
    {
        $user = $request->user();

        $activeFixtureIds = MatchReminder::where('user_id', $user->id)
            ->where('status', MatchReminder::STATUS_PENDING)
            ->pluck('fixture_id')
            ->filter()
            ->values();

        return response()->json([
            'active_fixture_ids' => $activeFixtureIds,
        ]);
    }
}
