<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Booking\Events\BookingCreated;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Models\City;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Domains\Tournament\Services\TournamentRegistrationService;
use App\Models\Preset;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class OnboardingController extends Controller
{
    public function __construct(
        private readonly CurrentTeamResolver $resolver,
        private readonly ImageThumbnailService $images,
        private readonly TournamentRegistrationService $tournamentRegistration,
    ) {}

    private function ensureManager($user): void
    {
        if (! $user || ! in_array($user->role, ['manager', 'admin'], true)) {
            abort(403, 'هذا القسم مخصص لمدربي الفرق فقط');
        }
    }

    /**
     * Get the current manager's onboarding progress and data.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureManager($user);
        $team = $this->resolver->for($user);

        if (! $team) {
            $team = Team::create([
                'name' => 'فريق ' . ($user->name ?? 'جديد'),
                'manager_id' => $user->id,
                'category' => 'adult',
                'visibility' => 'public',
            ]);
            $user->current_team_id = $team->id;
            $user->save();
        }

        $team->loadMissing(['primaryStadium']);

        $players = Player::query()
            ->where('team_id', $team->id)
            ->select(['id', 'team_id', 'name', 'number', 'position', 'phone', 'is_whatsapp'])
            ->get();

        $schedules = TerrainBooking::query()
            ->where('team_id', $team->id)
            ->where('source', 'imported_manual')
            ->orderBy('id', 'desc')
            ->get(['id', 'custom_pitch_name', 'day_of_week', 'start_time', 'end_time', 'source']);

        $tournaments = Tournament::query()
            ->whereIn('status', [
                Tournament::STATUS_OPEN_FOR_REGISTRATION,
                Tournament::STATUS_REGISTRATION_CLOSED,
            ])
            ->visible()
            ->latest()
            ->get()
            ->map(function (Tournament $t) use ($team) {
                $registration = TournamentTeam::query()
                    ->where('tournament_id', $t->id)
                    ->where('team_id', $team->id)
                    ->first();

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'slug' => $t->slug,
                    'location' => $t->location,
                    'start_date' => $t->start_date?->toDateString(),
                    'registration_deadline' => $t->registration_deadline?->toDateString(),
                    'registration_fee' => $t->registration_fee,
                    'rules' => $t->rules,
                    'max_players_per_team' => $t->max_players_per_team ?? 15,
                    'status' => $t->status,
                    'is_registered' => (bool) $registration,
                    'registration_status' => $registration?->status,
                    'rules_accepted' => (bool) $registration?->rules_accepted_at,
                    'rules_accepted_at' => $registration?->rules_accepted_at?->toIso8601String(),
                ];
            });

        // Compute completion percentage
        $percentage = 25; // Base registration done
        if ($schedules->isNotEmpty() || in_array($user->onboarding_step, ['tournament', 'roster', 'completed'], true)) {
            $percentage += 25;
        }
        if ($tournaments->contains('is_registered', true) || in_array($user->onboarding_step, ['roster', 'completed'], true)) {
            $percentage += 25;
        }
        if ($players->isNotEmpty() || $user->onboarding_step === 'completed' || ! is_null($user->onboarding_completed_at)) {
            $percentage += 25;
        }

        $presets = Preset::query()
            ->active()
            ->category(Preset::CATEGORY_TEAM_LOGO)
            ->ordered()
            ->take(12)
            ->get()
            ->map(fn (Preset $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'image_url' => $p->image_url,
            ]);

        $stadiums = Stadium::query()
            ->where('is_open', true)
            ->where('is_available', true)
            ->orderBy('name')
            ->take(100)
            ->get(['id', 'name', 'city', 'address', 'total_price', 'price_per_team']);

        $cities = City::query()
            ->active()
            ->ordered()
            ->get(['id', 'name', 'name_ar', 'name_fr', 'name_en', 'slug'])
            ->map(fn (City $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'name_ar' => $c->name_ar,
                'localized_name' => $c->localized_name,
                'slug' => $c->slug,
            ]);

        return response()->json([
            'step' => $user->onboarding_step ?: 'team',
            'is_completed' => ! is_null($user->onboarding_completed_at),
            'completed_at' => $user->onboarding_completed_at?->toIso8601String(),
            'completion_percentage' => min($percentage, 100),
            'team' => $team,
            'players' => $players,
            'schedules' => $schedules,
            'tournaments' => $tournaments,
            'presets' => $presets,
            'stadiums' => $stadiums,
            'cities' => $cities,
        ]);
    }

    /**
     * Step 1: Update Team Profile (Name, City, Logo).
     */
    public function updateTeam(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureManager($user);
        $team = $this->resolver->for($user);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'is_whatsapp' => 'nullable|boolean',
            'city' => 'nullable|string|max:255',
            'category' => 'nullable|in:adult,teenager,children',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'preset_id' => 'nullable|integer|exists:presets,id',
        ]);

        $team->name = $validated['name'];
        if (isset($validated['city'])) {
            $team->city = $validated['city'];
        }
        if (isset($validated['category'])) {
            $team->category = $validated['category'];
        }

        if (! empty($validated['phone'])) {
            $user->phone = $validated['phone'];
            if (isset($validated['is_whatsapp'])) {
                $user->is_whatsapp = (bool) $validated['is_whatsapp'];
            }
            $user->save();
        }

        if ($request->hasFile('logo')) {
            if ($team->logo_path && Storage::disk('public')->exists($team->logo_path)) {
                Storage::disk('public')->delete($team->logo_path);
            }
            if ($team->logo_thumbnail_path && Storage::disk('public')->exists($team->logo_thumbnail_path)) {
                Storage::disk('public')->delete($team->logo_thumbnail_path);
            }

            $stored = $this->images->storeWithThumbnail($request->file('logo'), 'teams/logos');
            $team->logo_path = $stored['path'];
            $team->logo_thumbnail_path = $stored['thumbnail_path'];
        } elseif (! empty($validated['preset_id'])) {
            $preset = Preset::query()->active()->find($validated['preset_id']);
            if ($preset && $preset->category === Preset::CATEGORY_TEAM_LOGO) {
                $result = $this->images->copyFromPath($preset->image_path, 'teams/logos');
                $team->logo_path = $result['path'];
                $team->logo_thumbnail_path = $result['thumbnail_path'];
            }
        }

        $team->save();

        if ($user->onboarding_step === 'team' || is_null($user->onboarding_step)) {
            $user->onboarding_step = 'schedule';
            $user->save();
        }

        return response()->json([
            'message' => 'تم حفظ معلومات الفريق بنجاح',
            'team' => $team->fresh(),
            'next_step' => 'schedule',
        ]);
    }

    /**
     * Step 2: Save Regular Friendly / Pitch Schedule (or skip).
     */
    public function saveSchedule(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureManager($user);
        $team = $this->resolver->for($user);

        $validated = $request->validate([
            'has_regular_time' => 'required|boolean',
            'day_of_week' => 'nullable|integer|between:0,6',
            'start_time' => 'nullable|string|max:10',
            'end_time' => 'nullable|string|max:10',
            'pitch_name' => 'nullable|string|max:255',
            'terrain_id' => 'nullable|integer',
            'schedules' => 'nullable|array',
            'schedules.*.day_of_week' => 'required|integer|between:0,6',
            'schedules.*.start_time' => 'required|string|max:10',
            'schedules.*.end_time' => 'nullable|string|max:10',
            'schedules.*.pitch_name' => 'nullable|string|max:255',
            'schedules.*.terrain_id' => 'nullable|integer',
            'schedules.*.reservation_type' => 'nullable|string|in:single,weekly_subscription',
            'schedules.*.booking_date' => 'nullable|date|after_or_equal:today',
        ]);

        $createdBookings = [];
        $warnings = [];

        if ($validated['has_regular_time']) {
            // Delete previous manual and pending onboarding schedule for this team to keep clean entries
            TerrainBooking::query()
                ->where('team_id', $team->id)
                ->where(function ($q) {
                    $q->where('source', 'imported_manual')
                        ->orWhere(function ($sq) {
                            $sq->where('source', 'onboarding')->where('status', 'pending');
                        });
                })
                ->delete();

            $items = [];
            if (! empty($validated['schedules']) && is_array($validated['schedules'])) {
                foreach ($validated['schedules'] as $s) {
                    if (isset($s['day_of_week']) && ! empty($s['start_time'])) {
                        $startTime = $s['start_time'];
                        $endTime = ! empty($s['end_time'])
                            ? $s['end_time']
                            : self::calculateEndTime($startTime);

                        $items[] = [
                            'day_of_week' => (int) $s['day_of_week'],
                            'start_time' => $startTime,
                            'end_time' => $endTime,
                            'pitch_name' => ! empty($s['pitch_name']) ? trim($s['pitch_name']) : 'ملعب اعتيادي',
                            'terrain_id' => ! empty($s['terrain_id']) ? (int) $s['terrain_id'] : null,
                            'reservation_type' => ! empty($s['reservation_type']) ? $s['reservation_type'] : 'weekly_subscription',
                            'booking_date' => ! empty($s['booking_date']) ? $s['booking_date'] : null,
                        ];
                    }
                }
            } elseif (isset($validated['day_of_week']) && ! empty($validated['start_time'])) {
                $startTime = $validated['start_time'];
                $endTime = ! empty($validated['end_time'])
                    ? $validated['end_time']
                    : self::calculateEndTime($startTime);

                $items[] = [
                    'day_of_week' => (int) $validated['day_of_week'],
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'pitch_name' => ! empty($validated['pitch_name']) ? trim($validated['pitch_name']) : 'ملعب اعتيادي',
                    'terrain_id' => ! empty($validated['terrain_id']) ? (int) $validated['terrain_id'] : null,
                    'reservation_type' => 'weekly_subscription',
                    'booking_date' => null,
                ];
            }

            foreach ($items as $item) {
                if (! empty($item['terrain_id'])) {
                    $reservationType = $item['reservation_type'] ?? 'weekly_subscription';
                    if ($reservationType === 'single' && ! empty($item['booking_date'])) {
                        $bookingDate = Carbon::parse($item['booking_date'])->toDateString();
                        $dayOfWeek = Carbon::parse($bookingDate)->dayOfWeek;
                        $startDate = null;
                    } else {
                        $dayOfWeek = (int) $item['day_of_week'];
                        $today = Carbon::today();
                        $target = $today->isDayOfWeek($dayOfWeek) ? $today : $today->copy()->next($dayOfWeek);
                        $bookingDate = $target->toDateString();
                        $startDate = Carbon::today()->toDateString();
                    }

                    $conflict = TerrainBooking::getConflictMessage(
                        (int) $item['terrain_id'],
                        $bookingDate,
                        $item['start_time'],
                        $item['end_time']
                    );

                    if ($conflict) {
                        $warnings[] = "يوجد تعارض في الموعد {$item['start_time']}: " . $conflict;
                        continue;
                    }

                    $terrain = Stadium::find($item['terrain_id']);
                    $price = (float) ($terrain?->price_per_team ?? 0);
                    if ($reservationType === 'weekly_subscription') {
                        $price = $price * 4;
                    }

                    DB::transaction(function () use ($item, $team, $user, $reservationType, $bookingDate, $startDate, $dayOfWeek, $price, &$createdBookings) {
                        $booking = TerrainBooking::create([
                            'team_id' => $team->id,
                            'manager_id' => $user->id,
                            'terrain_id' => $item['terrain_id'],
                            'booking_type' => 'training',
                            'flow_type' => 'direct',
                            'reservation_type' => $reservationType,
                            'source' => 'onboarding',
                            'custom_pitch_name' => $item['pitch_name'],
                            'day_of_week' => $dayOfWeek,
                            'start_time' => $item['start_time'],
                            'end_time' => $item['end_time'],
                            'start_date' => $startDate,
                            'booking_date' => $bookingDate,
                            'price' => $price,
                            'status' => 'pending',
                            'booking_reference' => TerrainBooking::generateReference(),
                        ]);

                        event(new BookingCreated($booking));
                        $createdBookings[] = $booking;
                    });
                } else {
                    $booking = TerrainBooking::create([
                        'team_id' => $team->id,
                        'manager_id' => $user->id,
                        'terrain_id' => null,
                        'booking_type' => 'training',
                        'flow_type' => 'amical',
                        'reservation_type' => 'weekly',
                        'source' => 'imported_manual',
                        'custom_pitch_name' => $item['pitch_name'],
                        'day_of_week' => $item['day_of_week'],
                        'start_time' => $item['start_time'],
                        'end_time' => $item['end_time'],
                        'booking_date' => now()->toDateString(),
                        'status' => 'confirmed',
                    ]);
                    $createdBookings[] = $booking;
                }
            }
        } else {
            TerrainBooking::query()
                ->where('team_id', $team->id)
                ->where(function ($q) {
                    $q->where('source', 'imported_manual')
                        ->orWhere(function ($sq) {
                            $sq->where('source', 'onboarding')->where('status', 'pending');
                        });
                })
                ->delete();
        }

        $user->onboarding_step = 'tournament';
        $user->save();

        return response()->json([
            'message' => 'تم حفظ تفاصيل المواعيد بنجاح',
            'next_step' => 'tournament',
            'bookings' => $createdBookings,
            'warnings' => $warnings,
        ]);
    }

    /**
     * Step 3: Tournament Agreement & Rules Acceptance (or skip).
     */
    public function saveTournamentAgreement(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureManager($user);
        $team = $this->resolver->for($user);

        $validated = $request->validate([
            'tournament_id' => 'nullable|exists:tournaments,id',
            'agreed' => 'nullable|boolean',
            'skip' => 'nullable|boolean',
        ]);

        if (empty($validated['skip']) && ! empty($validated['tournament_id'])) {
            $tournament = Tournament::findOrFail($validated['tournament_id']);

            $tournamentTeam = TournamentTeam::firstOrNew([
                'tournament_id' => $tournament->id,
                'team_id' => $team->id,
            ]);

            $tournamentTeam->status = $tournamentTeam->status ?: TournamentTeam::STATUS_PENDING;
            $tournamentTeam->payment_status = $tournamentTeam->payment_status ?: TournamentTeam::PAYMENT_PENDING;
            $tournamentTeam->rules_accepted_at = now();
            $tournamentTeam->rules_accepted_by = $user->id;
            $tournamentTeam->rules_version = '1.0';
            $tournamentTeam->save();
        }

        $user->onboarding_step = 'roster';
        $user->save();

        return response()->json([
            'message' => 'تم تسجيل رغبة المشاركة والموافقة على القانون',
            'next_step' => 'roster',
        ]);
    }

    /**
     * Step 4: Add Players to General Roster.
     */
    public function savePlayers(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureManager($user);
        $team = $this->resolver->for($user);

        $validated = $request->validate([
            'players' => 'nullable|array',
            'players.*.name' => 'required|string|max:255',
            'players.*.number' => 'nullable|integer|between:1,99',
            'players.*.position' => 'nullable|string|max:100',
            'players.*.phone' => 'nullable|string|max:30',
            'skip' => 'nullable|boolean',
        ]);

        if (! empty($validated['players'])) {
            foreach ($validated['players'] as $pData) {
                if (empty(trim($pData['name'] ?? ''))) {
                    continue;
                }

                Player::create([
                    'team_id' => $team->id,
                    'name' => trim($pData['name']),
                    'number' => $pData['number'] ?? null,
                    'position' => $pData['position'] ?? null,
                    'phone' => $pData['phone'] ?? null,
                    'status' => 'active',
                    'role' => 'starter',
                ]);
            }
        }

        $allPlayers = Player::where('team_id', $team->id)->get();

        return response()->json([
            'message' => 'تم حفظ اللاعبين بنجاح',
            'players' => $allPlayers,
            'next_step' => 'celebration',
        ]);
    }

    /**
     * Final Step: Complete Onboarding.
     */
    public function complete(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureManager($user);
        $team = $this->resolver->for($user);

        $user->onboarding_completed_at = now();
        $user->onboarding_step = 'completed';
        $user->save();

        $playersCount = Player::where('team_id', $team->id)->count();

        return response()->json([
            'message' => 'مبروك! اكتمل إعداد فريقك بنجاح',
            'is_completed' => true,
            'completed_at' => $user->onboarding_completed_at->toIso8601String(),
            'players_count' => $playersCount,
            'team' => $team,
        ]);
    }

    private static function calculateEndTime(string $startTime): string
    {
        try {
            return Carbon::parse($startTime)->addHour()->format('H:i');
        } catch (\Throwable) {
            return '21:00';
        }
    }
}
