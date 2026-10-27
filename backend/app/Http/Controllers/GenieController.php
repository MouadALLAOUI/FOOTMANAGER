<?php

namespace App\Http\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\FootballMatch;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GenieController extends Controller
{
    /**
     * Format Carbon datetime to pure Arabic string: "27 أكتوبر 2026"
     */
    protected function formatArabicDate($datetime): string
    {
        if (!$datetime) {
            return '';
        }
        $c = Carbon::parse($datetime);
        $arabicMonths = [
            1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل',
            5 => 'مايو', 6 => 'يونيو', 7 => 'يوليو', 8 => 'أغسطس',
            9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر'
        ];
        $month = $arabicMonths[$c->month] ?? '';
        return "{$c->day} {$month} {$c->year}";
    }

    /**
     * Format 24-hour time string: "17:00"
     */
    protected function format24hTime($datetime): string
    {
        if (!$datetime) {
            return '';
        }
        return Carbon::parse($datetime)->format('H:i');
    }

    /**
     * Extract user's first name in Arabic
     */
    protected function getFirstName($name): string
    {
        if (!$name) {
            return '';
        }
        $parts = preg_split('/\s+/', trim($name));
        return $parts[0] ?? $name;
    }

    /**
     * GET /api/genie/context
     * Automatically recognizes user role on server side, respecting priority:
     * tournament_committee > terrain_owner > player_or_manager > general_user > visitor
     */
    public function context(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'role' => 'visitor',
                'first_name' => '',
                'greeting' => 'مرحبًا بك في أجي نقصرو. كيف أساعدك؟',
                'suggestions' => [
                    [
                        'id' => 'faq_booking',
                        'title' => 'كيف أحجز ملعبًا؟',
                        'endpoint' => '/genie/faq/how-to-book-field',
                        'is_personal' => false,
                    ],
                    [
                        'id' => 'open_tournaments',
                        'title' => 'ما البطولات المفتوحة؟',
                        'endpoint' => '/genie/open-tournaments',
                        'is_personal' => false,
                    ],
                    [
                        'id' => 'faq_register_team',
                        'title' => 'كيف أسجّل فريقي؟',
                        'endpoint' => '/genie/faq/how-to-register-team',
                        'is_personal' => false,
                    ],
                ],
            ]);
        }

        $firstName = $this->getFirstName($user->name);

        // Check committee capabilities
        $isCommittee = in_array($user->role, ['committee', 'admin'])
            || Tournament::where('organizer_id', $user->id)->exists();

        // Check terrain owner capabilities
        $isTerrainOwner = $user->role === 'terrain_owner'
            || Stadium::where('owner_id', $user->id)->exists();

        // Check player or manager capabilities
        $isPlayerOrManager = in_array($user->role, ['manager', 'player'])
            || Team::where('manager_id', $user->id)->exists()
            || ($user->current_team_id !== null)
            || DB::table('players')->where('user_id', $user->id)->exists();

        // Determine primary role by strict priority order
        if ($isCommittee) {
            $role = 'tournament_committee';
            $greeting = "مرحبًا {$firstName}. أستطيع إطلاعك على بطولاتك ومباريات اليوم.";
            $suggestions = [
                [
                    'id' => 'today_matches',
                    'title' => 'مباريات اليوم',
                    'endpoint' => '/genie/today-matches',
                    'is_personal' => true,
                ],
                [
                    'id' => 'pending_results',
                    'title' => 'نتائج بانتظار الاعتماد',
                    'endpoint' => '/genie/pending-results',
                    'is_personal' => true,
                ],
                [
                    'id' => 'team_registrations',
                    'title' => 'حالة تسجيل الفرق',
                    'endpoint' => '/genie/team-registrations',
                    'is_personal' => true,
                ],
            ];
            // If they also own a stadium or manage a team, add secondary suggestion
            if ($isTerrainOwner) {
                $suggestions[] = [
                    'id' => 'today_bookings',
                    'title' => 'حجوزات ملاعبك لليوم',
                    'endpoint' => '/genie/today-bookings',
                    'is_personal' => true,
                ];
            } elseif ($isPlayerOrManager) {
                $suggestions[] = [
                    'id' => 'my_next_match',
                    'title' => 'مباراة فريقك القادمة',
                    'endpoint' => '/genie/my-next-match',
                    'is_personal' => true,
                ];
            }
        } elseif ($isTerrainOwner) {
            $role = 'terrain_owner';
            $greeting = "مرحبًا {$firstName}. أستطيع إطلاعك على حجوزات ملعبك.";
            $suggestions = [
                [
                    'id' => 'today_bookings',
                    'title' => 'حجوزات اليوم',
                    'endpoint' => '/genie/today-bookings',
                    'is_personal' => true,
                ],
                [
                    'id' => 'free_slots',
                    'title' => 'الفترات الشاغرة هذا الأسبوع',
                    'endpoint' => '/genie/free-slots',
                    'is_personal' => true,
                ],
                [
                    'id' => 'pending_bookings',
                    'title' => 'الحجوزات بانتظار التأكيد',
                    'endpoint' => '/genie/pending-bookings',
                    'is_personal' => true,
                ],
            ];
            if ($isPlayerOrManager) {
                $suggestions[] = [
                    'id' => 'my_next_match',
                    'title' => 'مباراة فريقك القادمة',
                    'endpoint' => '/genie/my-next-match',
                    'is_personal' => true,
                ];
            }
        } elseif ($isPlayerOrManager) {
            $role = 'player_or_manager';
            $greeting = "مرحبًا {$firstName}. كيف أساعدك اليوم؟";
            $suggestions = [
                [
                    'id' => 'my_next_match',
                    'title' => 'مباراتي القادمة',
                    'endpoint' => '/genie/my-next-match',
                    'is_personal' => true,
                ],
                [
                    'id' => 'my_team_rank',
                    'title' => 'ترتيب فريقي في البطولة',
                    'endpoint' => '/genie/my-team-rank',
                    'is_personal' => true,
                ],
                [
                    'id' => 'my_last_result',
                    'title' => 'نتيجة آخر مباراة',
                    'endpoint' => '/genie/my-last-result',
                    'is_personal' => true,
                ],
            ];
        } else {
            $role = 'general_user';
            $greeting = "مرحبًا {$firstName}. كيف أساعدك اليوم؟";
            $suggestions = [
                [
                    'id' => 'faq_booking',
                    'title' => 'كيف أحجز ملعبًا؟',
                    'endpoint' => '/genie/faq/how-to-book-field',
                    'is_personal' => false,
                ],
                [
                    'id' => 'open_tournaments',
                    'title' => 'ما البطولات المفتوحة؟',
                    'endpoint' => '/genie/open-tournaments',
                    'is_personal' => false,
                ],
                [
                    'id' => 'faq_register_team',
                    'title' => 'كيف أسجّل فريقي؟',
                    'endpoint' => '/genie/faq/how-to-register-team',
                    'is_personal' => false,
                ],
            ];
        }

        return response()->json([
            'authenticated' => true,
            'role' => $role,
            'first_name' => $firstName,
            'greeting' => $greeting,
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Resolve user's team ID safely
     */
    protected function resolveUserTeamId($user): ?int
    {
        if (!$user) {
            return null;
        }

        // 1. Manager team
        $managedTeam = Team::where('manager_id', $user->id)->first();
        if ($managedTeam) {
            return $managedTeam->id;
        }

        // 2. User current_team_id
        if (!empty($user->current_team_id)) {
            return (int) $user->current_team_id;
        }

        // 3. Player record
        $player = DB::table('players')->where('user_id', $user->id)->first();
        if ($player && !empty($player->team_id)) {
            return (int) $player->team_id;
        }

        return null;
    }

    /**
     * GET /api/genie/my-next-match
     */
    public function myNextMatch(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $teamId = $this->resolveUserTeamId($user);
        if (!$teamId) {
            return response()->json([
                'has_data' => false,
                'message' => 'لا توجد مباريات قادمة',
                'description' => 'لم يتم العثور على فريق مرتبط بحسابك حاليًا.',
                'cta_text' => 'عرض المباريات المتاحة',
                'cta_link' => '/matches',
            ]);
        }

        $myTeam = Team::find($teamId);
        $myTeamName = $myTeam ? $myTeam->name : 'فريقك';

        // Check upcoming fixtures first
        $fixture = Fixture::where(function ($q) use ($teamId) {
            $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
        })
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', now()->subHours(2))
            ->where('status', '!=', 'cancelled')
            ->orderBy('scheduled_at', 'asc')
            ->first();

        if ($fixture) {
            $isHome = $fixture->home_team_id === $teamId;
            $oppTeamId = $isHome ? $fixture->away_team_id : $fixture->home_team_id;
            $oppTeam = $oppTeamId ? Team::find($oppTeamId) : null;
            $stadium = $fixture->stadium_id ? Stadium::find($fixture->stadium_id) : null;

            return response()->json([
                'has_data' => true,
                'type' => 'fixture',
                'card' => [
                    'title' => 'مباراة بطولة رسمية',
                    'home_team' => $isHome ? $myTeamName : ($oppTeam ? $oppTeam->name : 'فريق منافس'),
                    'away_team' => $isHome ? ($oppTeam ? $oppTeam->name : 'فريق منافس') : $myTeamName,
                    'date' => $this->formatArabicDate($fixture->scheduled_at),
                    'time' => $this->format24hTime($fixture->scheduled_at),
                    'stadium' => $stadium ? $stadium->name : 'ملعب معتمد',
                    'status_label' => 'مؤكدة',
                ],
                'cta_text' => 'عرض التفاصيل',
                'cta_link' => $fixture->competition_id ? "/tournaments/{$fixture->competition_id}" : '/matches',
            ]);
        }

        // Check upcoming friendly match requests
        $matchRequest = MatchRequest::where(function ($q) use ($teamId) {
            $q->where('host_team_id', $teamId)->orWhere('opponent_team_id', $teamId);
        })
            ->whereIn('status', ['accepted', 'open'])
            ->whereNotNull('match_datetime')
            ->where('match_datetime', '>=', now()->subHours(2))
            ->orderBy('match_datetime', 'asc')
            ->first();

        // If no future match found, check any latest accepted match request as fallback
        if (!$matchRequest) {
            $matchRequest = MatchRequest::where(function ($q) use ($teamId) {
                $q->where('host_team_id', $teamId)->orWhere('opponent_team_id', $teamId);
            })
                ->where('status', 'accepted')
                ->orderBy('match_datetime', 'desc')
                ->first();
        }

        if ($matchRequest) {
            $isHost = $matchRequest->host_team_id === $teamId;
            $oppTeamId = $isHost ? $matchRequest->opponent_team_id : $matchRequest->host_team_id;
            $oppTeam = $oppTeamId ? Team::find($oppTeamId) : null;
            $oppName = $oppTeam ? $oppTeam->name : ($matchRequest->guest_team_name ?: 'فريق منافس');
            $stadium = $matchRequest->stadium_id ? Stadium::find($matchRequest->stadium_id) : null;

            return response()->json([
                'has_data' => true,
                'type' => 'friendly',
                'card' => [
                    'title' => 'مباراة ودية',
                    'home_team' => $isHost ? $myTeamName : $oppName,
                    'away_team' => $isHost ? $oppName : $myTeamName,
                    'date' => $this->formatArabicDate($matchRequest->match_datetime),
                    'time' => $this->format24hTime($matchRequest->match_datetime),
                    'stadium' => $stadium ? $stadium->name : ($matchRequest->custom_terrain_name ?: 'ملعب معتمد'),
                    'status_label' => $matchRequest->status === 'accepted' ? 'مؤكدة' : 'بانتظار التأكيد',
                ],
                'cta_text' => 'عرض التفاصيل',
                'cta_link' => '/matches',
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'لا توجد مباريات قادمة',
            'cta_text' => 'عرض التحديات المتاحة',
            'cta_link' => '/matches',
        ]);
    }

    /**
     * GET /api/genie/my-team-rank
     */
    public function myTeamRank(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $teamId = $this->resolveUserTeamId($user);
        if (!$teamId) {
            return response()->json([
                'has_data' => false,
                'message' => 'فريقك غير مسجل في بطولة جارية حاليًا.',
                'cta_text' => 'استعراض البطولات',
                'cta_link' => '/tournaments',
            ]);
        }

        $myTeam = Team::find($teamId);
        $teamName = $myTeam ? $myTeam->name : 'فريقك';

        $registration = DB::table('tournament_teams')
            ->where('team_id', $teamId)
            ->first();

        if ($registration) {
            $tournament = Tournament::find($registration->tournament_id);
            $tournamentName = $tournament ? $tournament->name : 'البطولة الجارية';
            $position = $registration->group_position ?? 1;

            return response()->json([
                'has_data' => true,
                'card' => [
                    'team_name' => $teamName,
                    'tournament_name' => $tournamentName,
                    'rank' => "المركز {$position}",
                    'status_label' => $registration->status === 'accepted' ? 'مشارك معتمد' : 'بانتظار الاعتماد',
                ],
                'cta_text' => 'عرض جدول البطولة',
                'cta_link' => "/tournaments/{$registration->tournament_id}",
            ]);
        }

        // If not in a tournament, check if any open tournament exists
        return response()->json([
            'has_data' => false,
            'message' => 'فريقك غير مسجل في بطولة جارية حاليًا.',
            'cta_text' => 'استعراض البطولات المتاحة',
            'cta_link' => '/tournaments',
        ]);
    }

    /**
     * GET /api/genie/my-last-result
     */
    public function myLastResult(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $teamId = $this->resolveUserTeamId($user);
        if (!$teamId) {
            return response()->json([
                'has_data' => false,
                'message' => 'لا توجد نتائج سابقة مسجلة.',
                'cta_text' => 'استعراض التحديات',
                'cta_link' => '/matches',
            ]);
        }

        $myTeam = Team::find($teamId);
        $myTeamName = $myTeam ? $myTeam->name : 'فريقك';

        // Check completed match request
        $lastMatch = MatchRequest::where(function ($q) use ($teamId) {
            $q->where('host_team_id', $teamId)->orWhere('opponent_team_id', $teamId);
        })
            ->where('status', 'completed')
            ->whereNotNull('host_score')
            ->whereNotNull('opponent_score')
            ->orderBy('match_datetime', 'desc')
            ->first();

        if ($lastMatch) {
            $isHost = $lastMatch->host_team_id === $teamId;
            $oppTeamId = $isHost ? $lastMatch->opponent_team_id : $lastMatch->host_team_id;
            $oppTeam = $oppTeamId ? Team::find($oppTeamId) : null;
            $oppName = $oppTeam ? $oppTeam->name : ($lastMatch->guest_team_name ?: 'فريق منافس');

            $homeScore = (int) $lastMatch->host_score;
            $awayScore = (int) $lastMatch->opponent_score;
            $myScore = $isHost ? $homeScore : $awayScore;
            $oppScore = $isHost ? $awayScore : $homeScore;

            $resultText = $myScore > $oppScore ? 'فوز' : ($myScore < $oppScore ? 'خسارة' : 'تعادل');

            return response()->json([
                'has_data' => true,
                'card' => [
                    'title' => 'نتيجة آخر مباراة',
                    'home_team' => $isHost ? $myTeamName : $oppName,
                    'away_team' => $isHost ? $oppName : $myTeamName,
                    'score' => "{$homeScore} - {$awayScore}",
                    'result_summary' => "{$resultText} ({$myScore} مقابل {$oppScore})",
                    'date' => $this->formatArabicDate($lastMatch->match_datetime),
                ],
                'cta_text' => 'عرض تفاصيل المباراة',
                'cta_link' => '/matches',
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'لا توجد نتائج سابقة مسجلة.',
            'cta_text' => 'استعراض المباريات',
            'cta_link' => '/matches',
        ]);
    }

    /**
     * GET /api/genie/today-matches (Committee)
     */
    public function todayMatches(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $tournaments = Tournament::where('organizer_id', $user->id)->get();
        if ($tournaments->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لا توجد بطولات مسجلة باسمك حاليًا.',
                'cta_text' => 'إنشاء بطولة جديدة',
                'cta_link' => '/committee/tournaments',
            ]);
        }

        $tournIds = $tournaments->pluck('id');

        // Look for scheduled fixtures in committee tournaments
        $todayFixture = Fixture::whereIn('competition_id', $tournIds)
            ->whereNotNull('scheduled_at')
            ->whereDate('scheduled_at', Carbon::today())
            ->where('status', '!=', 'cancelled')
            ->orderBy('scheduled_at', 'asc')
            ->first();

        // If no fixture scheduled strictly for today, get next scheduled fixture
        if (!$todayFixture) {
            $todayFixture = Fixture::whereIn('competition_id', $tournIds)
                ->whereNotNull('scheduled_at')
                ->where('status', 'scheduled')
                ->orderBy('scheduled_at', 'asc')
                ->first();
        }

        if ($todayFixture) {
            $homeTeam = Team::find($todayFixture->home_team_id);
            $awayTeam = Team::find($todayFixture->away_team_id);
            $stadium = $todayFixture->stadium_id ? Stadium::find($todayFixture->stadium_id) : null;
            $tourn = Tournament::find($todayFixture->competition_id);

            return response()->json([
                'has_data' => true,
                'card' => [
                    'tournament_name' => $tourn ? $tourn->name : 'بطولتك',
                    'home_team' => $homeTeam ? $homeTeam->name : 'فريق 1',
                    'away_team' => $awayTeam ? $awayTeam->name : 'فريق 2',
                    'date' => $this->formatArabicDate($todayFixture->scheduled_at),
                    'time' => $this->format24hTime($todayFixture->scheduled_at),
                    'stadium' => $stadium ? $stadium->name : 'ملعب معتمد',
                ],
                'cta_text' => 'إدارة جدول البطولة',
                'cta_link' => "/committee/tournaments/{$todayFixture->competition_id}",
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'لا توجد مباريات مجدولة اليوم في بطولاتك.',
            'cta_text' => 'إدارة البطولات',
            'cta_link' => '/committee/tournaments',
        ]);
    }

    /**
     * GET /api/genie/pending-results (Committee)
     */
    public function pendingResults(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $tournaments = Tournament::where('organizer_id', $user->id)->get();
        if ($tournaments->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لا توجد بطولات مسجلة باسمك حاليًا.',
            ]);
        }

        $tournIds = $tournaments->pluck('id');

        // Check fixtures awaiting score or verification
        $pendingCount = Fixture::whereIn('competition_id', $tournIds)
            ->whereIn('status', ['waiting_for_booking', 'unscheduled'])
            ->count();

        if ($pendingCount > 0) {
            return response()->json([
                'has_data' => true,
                'card' => [
                    'title' => 'متابعة نتائج ومواعيد الجولات',
                    'count' => $pendingCount,
                    'summary' => "توجد {$pendingCount} مباراة تتطلب حجز ملعب أو اعتماد مواعيد.",
                ],
                'cta_text' => 'مراجعة واعتماد المواعيد',
                'cta_link' => '/committee/tournaments',
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'لا توجد نتائج بانتظار الاعتماد حاليًا.',
            'cta_text' => 'إدارة البطولات',
            'cta_link' => '/committee/tournaments',
        ]);
    }

    /**
     * GET /api/genie/team-registrations (Committee)
     */
    public function teamRegistrations(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $tournaments = Tournament::where('organizer_id', $user->id)->get();
        if ($tournaments->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لا توجد بطولات مسجلة باسمك حاليًا.',
            ]);
        }

        $tournIds = $tournaments->pluck('id');
        $totalRegistered = DB::table('tournament_teams')->whereIn('tournament_id', $tournIds)->count();
        $pendingApproval = DB::table('tournament_teams')
            ->whereIn('tournament_id', $tournIds)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'has_data' => true,
            'card' => [
                'title' => 'حالة تسجيل الفرق في بطولاتك',
                'total_teams' => $totalRegistered,
                'pending_approval' => $pendingApproval,
                'summary' => "إجمالي الفرق: {$totalRegistered} فريقًا (بانتظار التدقيق: {$pendingApproval}).",
            ],
            'cta_text' => 'إدارة الفرق المسجلة',
            'cta_link' => '/committee/tournaments',
        ]);
    }

    /**
     * GET /api/genie/today-bookings (Terrain Owner)
     */
    public function todayBookings(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $stadiums = Stadium::where('owner_id', $user->id)->get();
        if ($stadiums->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لم يتم العثور على ملاعب مسجلة بحسابك حاليًا.',
                'cta_text' => 'إضافة ملعب',
                'cta_link' => '/terrain/fields',
            ]);
        }

        $stadiumIds = $stadiums->pluck('id');
        $booking = TerrainBooking::whereIn('terrain_id', $stadiumIds)
            ->whereDate('booking_date', Carbon::today())
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_time', 'asc')
            ->first();

        // Fallback to latest upcoming booking
        if (!$booking) {
            $booking = TerrainBooking::whereIn('terrain_id', $stadiumIds)
                ->where('status', '!=', 'cancelled')
                ->orderBy('booking_date', 'desc')
                ->first();
        }

        if ($booking) {
            $stadium = Stadium::find($booking->terrain_id);
            $customerName = $booking->guest_name ?: 'مسؤول الفريق';
            $startTime = substr($booking->start_time ?? '18:00', 0, 5);
            $endTime = substr($booking->end_time ?? '19:30', 0, 5);

            return response()->json([
                'has_data' => true,
                'card' => [
                    'stadium_name' => $stadium ? $stadium->name : 'ملعبك',
                    'date' => $this->formatArabicDate($booking->booking_date),
                    'time_slot' => "من {$startTime} إلى {$endTime}",
                    'customer' => $customerName,
                    'status_label' => $booking->status === 'confirmed' ? 'مؤكد' : 'قيد التأكيد',
                ],
                'cta_text' => 'عرض جدول الحجوزات',
                'cta_link' => '/terrain/bookings',
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'لا توجد حجوزات مسجلة لليوم.',
            'cta_text' => 'عرض الحجوزات',
            'cta_link' => '/terrain/bookings',
        ]);
    }

    /**
     * GET /api/genie/free-slots (Terrain Owner)
     */
    public function freeSlots(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $stadiums = Stadium::where('owner_id', $user->id)->get();
        if ($stadiums->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لم يتم العثور على ملاعب مسجلة بحسابك حاليًا.',
            ]);
        }

        return response()->json([
            'has_data' => true,
            'card' => [
                'title' => 'الفترات الشاغرة هذا الأسبوع',
                'summary' => 'ملاعبك جاهزة لاستقبال الحجوزات خلال فترات ما بعد الزوال والمساء.',
                'advice' => 'يمكنك تفعيل تسعيرة الفترات الهادئة لزيادة الإقبال.',
            ],
            'cta_text' => 'إدارة الفترات والأسعار',
            'cta_link' => '/terrain/fields',
        ]);
    }

    /**
     * GET /api/genie/pending-bookings (Terrain Owner)
     */
    public function pendingBookings(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'authenticated' => false,
                'message' => 'لعرض هذه المعلومة سجّل الدخول أولًا.',
            ], 401);
        }

        $stadiums = Stadium::where('owner_id', $user->id)->get();
        if ($stadiums->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لم يتم العثور على ملاعب مسجلة بحسابك حاليًا.',
            ]);
        }

        $stadiumIds = $stadiums->pluck('id');
        $pendingCount = TerrainBooking::whereIn('terrain_id', $stadiumIds)
            ->where('status', 'pending')
            ->count();

        if ($pendingCount > 0) {
            return response()->json([
                'has_data' => true,
                'card' => [
                    'title' => 'حجوزات بانتظار تأكيدك',
                    'count' => $pendingCount,
                    'summary' => "لديك {$pendingCount} حجز جديد بانتظار التأكيد.",
                ],
                'cta_text' => 'تأكيد الحجوزات الآن',
                'cta_link' => '/terrain/bookings',
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'لا توجد حجوزات بانتظار التأكيد.',
            'cta_text' => 'عرض سجل الحجوزات',
            'cta_link' => '/terrain/bookings',
        ]);
    }

    /**
     * GET /api/genie/open-tournaments (Public/Visitor)
     */
    public function openTournaments(Request $request): JsonResponse
    {
        $tournaments = Tournament::whereIn('status', ['published', 'draft', 'ongoing'])
            ->limit(3)
            ->get(['id', 'name', 'location', 'tournament_format', 'teams_count', 'status']);

        if ($tournaments->isEmpty()) {
            return response()->json([
                'has_data' => false,
                'message' => 'لا توجد بطولات مفتوحة للتسجيل حاليًا.',
                'cta_text' => 'استعراض البطولات',
                'cta_link' => '/tournaments',
            ]);
        }

        $list = $tournaments->map(function ($t) {
            return [
                'id' => $t->id,
                'name' => $t->name,
                'city' => $t->location ?: 'المغرب',
                'format' => $t->tournament_format ?: 'كرة قدم مصغرة',
            ];
        });

        return response()->json([
            'has_data' => true,
            'tournaments' => $list,
            'card' => [
                'title' => 'البطولات المفتوحة للتسجيل',
                'count' => $tournaments->count(),
                'summary' => "توجد {$tournaments->count()} بطولة مفتوحة للمشاركة في المنصة.",
            ],
            'cta_text' => 'استعراض كافة البطولات',
            'cta_link' => '/tournaments',
        ]);
    }

    /**
     * GET /api/genie/faq/{slug} (Public/Visitor FAQs)
     */
    public function faq(Request $request, string $slug): JsonResponse
    {
        if ($slug === 'how-to-book-field') {
            return response()->json([
                'has_data' => true,
                'card' => [
                    'title' => 'كيف أحجز ملعبًا؟',
                    'summary' => 'اختر مدينتك، ثم استعرض شبكة ملاعب القرب المعتمدة، وحدد التوقيت المناسب ونوع العشب، وأكد حجزك فوريًا.',
                ],
                'cta_text' => 'استعراض الملاعب المتاحة',
                'cta_link' => '/fields',
            ]);
        }

        if ($slug === 'how-to-register-team') {
            return response()->json([
                'has_data' => true,
                'card' => [
                    'title' => 'كيف أسجّل فريقي؟',
                    'summary' => 'أنشئ حساب مسير فريق، وأدخل اسم النادي وشعاره وقائمة لاعبيك، لتتمكن من إطلاق التحديات الودية والمشاركة في بطولات الأحياء.',
                ],
                'cta_text' => 'تسجيل مسير فريق جديد',
                'cta_link' => '/register?role=manager',
            ]);
        }

        return response()->json([
            'has_data' => false,
            'message' => 'المعلومة المطلوبة غير متوفرة حاليًا.',
        ], 404);
    }
}
