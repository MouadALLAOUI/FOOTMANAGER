<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Domains\Tournament\Resources\TournamentRegistrationResource;
use App\Domains\Tournament\Services\TournamentRegistrationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentRegistrationController extends Controller
{
    public function __construct(private readonly TournamentRegistrationService $registrationService)
    {
    }

    /**
     * Backend-driven registration availability for a tournament (guest-accessible).
     */
    public function availability(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        $registered = $tournament->registeredTeamsCount();
        $remaining = max(0, (int) $tournament->teams_count - $registered);
        $availability = $this->availabilityState($tournament, $remaining);

        return response()->json(['data' => [
            'tournament_id' => $tournament->id,
            'name' => $tournament->name,
            'status' => $tournament->status,
            'availability' => $availability,
            'can_register' => $availability === 'open',
            'teams_count' => (int) $tournament->teams_count,
            'registered_teams' => $registered,
            'remaining_slots' => $remaining,
            'registration_fee' => $tournament->registration_fee,
            'requires_registration_fee' => $tournament->registrationRequiresFee(),
            'registration_start_at' => $tournament->registration_start_at?->toIso8601String(),
            'registration_end_at' => $tournament->registration_end_at?->toIso8601String(),
        ]]);
    }

    /**
     * The authenticated user's eligible team(s) and their registration for this tournament.
     */
    public function me(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);
        $user = $request->user();

        $team = Team::query()->where('manager_id', $user->id)->first();

        $registration = null;
        if ($team) {
            $pivot = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $team->id)
                ->first();

            $registration = $pivot ? [
                'status' => $pivot->status,
                'payment_status' => $pivot->payment_status,
                'created_at' => $pivot->created_at?->toIso8601String(),
            ] : null;
        }

        return response()->json(['data' => [
            'eligible' => $user->role === 'manager' && $user->status === 'approved' && $team !== null,
            'reason' => ! $team
                ? 'no_team'
                : ($user->role !== 'manager' ? 'not_manager' : ($user->status !== 'approved' ? 'not_approved' : null)),
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'logo_url' => $team->logo_url,
                'category' => $team->category,
                'city' => $team->city,
            ] : null,
            'registration' => $registration,
        ]]);
    }

    /**
     * Submit a registration for one of the user's own teams.
     */
    public function register(Request $request, string $tournament): JsonResponse
    {
        $user = $request->user();
        $this->assertManagerApproved($user);

        $tournament = $this->resolveTournament($tournament);

        $team = Team::query()->find((int) $request->input('team_id'));

        if (! $team || (int) $team->manager_id !== (int) $user->id || $team->is_free) {
            throw new DomainException('لا يمكنك التسجيل بهذا الفريق', 422);
        }

        $registration = $this->registrationService->register($tournament, $team);

        return response()->json(['data' => new TournamentRegistrationResource($registration->load('team'))], 201);
    }

    /**
     * Cancel a pending registration for the user's team.
     */
    public function destroy(Request $request, string $tournament): JsonResponse
    {
        $user = $request->user();
        $this->assertManagerApproved($user);

        $tournament = $this->resolveTournament($tournament);

        $team = Team::query()->where('manager_id', $user->id)->first();

        if (! $team) {
            throw new DomainException('يجب إنشاء ملف الفريق أولاً', 422);
        }

        $registration = $this->registrationService->cancel($tournament, $team);

        return response()->json(['data' => new TournamentRegistrationResource($registration->load('team'))]);
    }

    /**
     * Submit a tournament team join request via link (Public/Manager).
     */
    public function joinRequest(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        $validated = $request->validate([
            'team_name' => ['required', 'string', 'max:191'],
            'city' => ['nullable', 'string', 'max:100'],
            'manager_name' => ['required', 'string', 'max:191'],
            'manager_phone' => ['required', 'string', 'max:30'],
            'rules_accepted' => ['required', 'accepted'],
            'players' => ['nullable', 'array'],
            'players.*.name' => ['required_with:players', 'string', 'max:191'],
            'players.*.age' => ['nullable', 'integer', 'min:8', 'max:65'],
            'players.*.position' => ['nullable', 'string', 'max:50'],
            'logo' => ['nullable', 'file', 'image', 'max:5120'],
            'stadium_id' => ['nullable', 'integer', 'exists:stadiums,id'],
            'custom_pitch_name' => ['nullable', 'string', 'max:191'],
            'booking_day_of_week' => ['nullable', 'integer', 'between:0,6'],
            'booking_time' => ['nullable', 'string', 'max:10'],
            'pitch_notes' => ['nullable', 'string', 'max:500'],
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $tournament, $validated) {
            $tournament = Tournament::query()->lockForUpdate()->findOrFail($tournament->id);

            // Clean Moroccan phone number
            $phone = preg_replace('/[^\d+]/', '', $validated['manager_phone']);
            if (str_starts_with($phone, '0')) {
                $phone = '+212' . substr($phone, 1);
            } elseif (! str_starts_with($phone, '+')) {
                $phone = '+212' . $phone;
            }

            // Find or create manager user safely by phone or email
            $email = 'manager_' . preg_replace('/\D/', '', $phone) . '@ajin9essro.com';
            $user = User::query()->where('phone', $phone)->orWhere('email', $email)->first();
            if (! $user) {
                $user = User::query()->create([
                    'name' => trim($validated['manager_name']),
                    'email' => $email,
                    'phone' => $phone,
                    'role' => 'manager',
                    'status' => 'pending',
                    'is_whatsapp' => true,
                    'password' => bcrypt(str()->random(20)),
                ]);
            } else {
                $userUpdates = [];
                if (! $user->phone) {
                    $userUpdates['phone'] = $phone;
                }
                if (! $user->email) {
                    $userUpdates['email'] = $email;
                }
                if (! empty($userUpdates)) {
                    $user->update($userUpdates);
                }
            }

            // Map tournament category safely to team category enum (adult, teenager, children)
            $teamCategory = match ($tournament->category) {
                'شبان', 'teenager' => 'teenager',
                'صغار', 'children' => 'children',
                default => 'adult',
            };

            // Check if team name already exists in this tournament
            $teamName = trim($validated['team_name']);
            $existingTeam = Team::query()->where('name', $teamName)->first();
            if ($existingTeam) {
                $existingReg = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('team_id', $existingTeam->id)
                    ->whereIn('status', [TournamentTeam::STATUS_REGISTERED, TournamentTeam::STATUS_PENDING])
                    ->first();

                if ($existingReg) {
                    throw new DomainException('فريق بهذا الاسم مسجل بالفعل أو طلبه قيد المراجعة في هذه البطولة', 409);
                }

                if ((int) $existingTeam->manager_id === (int) $user->id) {
                    $team = $existingTeam;
                    if ($request->filled('city')) {
                        $team->update(['city' => trim($validated['city'])]);
                    }
                } else {
                    $team = Team::query()->create([
                        'name' => $teamName,
                        'city' => trim($validated['city'] ?? $tournament->location ?? 'الدار البيضاء'),
                        'manager_id' => $user->id,
                        'is_free' => false,
                        'category' => $teamCategory,
                    ]);
                }
            } else {
                $team = Team::query()->create([
                    'name' => $teamName,
                    'city' => trim($validated['city'] ?? $tournament->location ?? 'الدار البيضاء'),
                    'manager_id' => $user->id,
                    'is_free' => false,
                    'category' => $teamCategory,
                ]);
            }

            // Handle logo file upload safely
            if ($request->hasFile('logo')) {
                try {
                    $logoFile = $request->file('logo');
                    $result = app(\App\Domains\Shared\Services\ImageThumbnailService::class)
                        ->storeWithThumbnail($logoFile, 'teams/logos');
                    $team->update([
                        'logo_path' => $result['path'],
                        'logo_thumbnail_path' => $result['thumbnail_path'],
                    ]);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Team logo thumbnail upload failed: ' . $e->getMessage());
                    $path = $request->file('logo')->store('teams/logos', 'public');
                    $team->update(['logo_path' => $path]);
                }
            }

            // Register tournament team with pending status (safely handling prior cancelled/rejected records)
            $registration = TournamentTeam::query()->updateOrCreate(
                [
                    'tournament_id' => $tournament->id,
                    'team_id' => $team->id,
                ],
                [
                    'status' => TournamentTeam::STATUS_PENDING,
                    'payment_status' => TournamentTeam::PAYMENT_PENDING,
                    'rules_accepted_at' => now(),
                    'rules_accepted_by' => $user->id,
                ]
            );

            // Register player list safely
            $players = $request->input('players', []);
            if (is_array($players)) {
                foreach ($players as $idx => $p) {
                    if (empty($p['name'])) continue;
                    $player = \App\Domains\Player\Models\Player::query()->firstOrCreate(
                        [
                            'team_id' => $team->id,
                            'name' => trim($p['name']),
                        ],
                        [
                            'position' => $p['position'] ?? 'midfielder',
                            'number' => $idx + 1,
                            'status' => 'active',
                        ]
                    );

                    \App\Domains\Tournament\Models\TournamentSquadMember::query()->firstOrCreate([
                        'tournament_id' => $tournament->id,
                        'team_id' => $team->id,
                        'player_id' => $player->id,
                    ]);
                }
            }

            // If league tournament, handle pitch reservation requiring pitch manager confirmation
            $pitchReservation = null;
            if ($tournament->tournament_format === 'league' && ($request->filled('stadium_id') || $request->filled('custom_pitch_name'))) {
                $stadiumId = $request->input('stadium_id');
                $dayOfWeek = $request->filled('booking_day_of_week') ? (int) $request->input('booking_day_of_week') : 5;
                $startTime = $request->input('booking_time', '20:00');
                $endTime = \Carbon\Carbon::parse($startTime)->addHour()->format('H:i');
                $bookingDate = now()->isDayOfWeek($dayOfWeek) ? now()->toDateString() : now()->next($dayOfWeek)->toDateString();

                $pitchReservation = \App\Domains\Booking\Models\TerrainBooking::query()->create([
                    'terrain_id' => $stadiumId ?: null,
                    'custom_pitch_name' => $stadiumId ? null : trim((string) $request->input('custom_pitch_name')),
                    'manager_id' => $user->id,
                    'team_id' => $team->id,
                    'booking_date' => $bookingDate,
                    'booking_type' => 'match',
                    'flow_type' => 'direct',
                    'reservation_type' => 'weekly_subscription',
                    'day_of_week' => $dayOfWeek,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'start_date' => $bookingDate,
                    'end_date' => now()->addMonths(6)->toDateString(),
                    'status' => 'pending', // Requires pitch manager approval
                    'notes' => 'طلب حجز أسبوعي لدوري: ' . $tournament->name . ($request->filled('pitch_notes') ? ' | ' . $request->input('pitch_notes') : ''),
                    'booking_reference' => \App\Domains\Booking\Models\TerrainBooking::generateReference(),
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'payment_required' => false,
                    'payment_status' => 'unpaid',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'تم إرسال طلب انضمام فريقكم بنجاح وهو قيد مراجعة المنظم',
                'data' => [
                    'team_id' => $team->id,
                    'team_name' => $team->name,
                    'manager_name' => $user->name,
                    'manager_phone' => $user->phone,
                    'status' => TournamentTeam::STATUS_PENDING,
                    'tournament_id' => $tournament->id,
                    'tournament_name' => $tournament->name,
                    'tournament_format' => $tournament->tournament_format,
                    'pitch_reservation' => $pitchReservation ? [
                        'id' => $pitchReservation->id,
                        'stadium_id' => $pitchReservation->terrain_id,
                        'custom_pitch_name' => $pitchReservation->custom_pitch_name,
                        'day_of_week' => $pitchReservation->day_of_week,
                        'start_time' => $pitchReservation->start_time,
                        'status' => $pitchReservation->status,
                    ] : null,
                ],
            ], 201);
        });
    }

    private function assertManagerApproved(User $user): void
    {
        if ($user->role !== 'manager') {
            throw new DomainException('التسجيل في البطولات متاح للمسيرين فقط', 403);
        }

        if ($user->status !== 'approved') {
            throw new DomainException('حسابك قيد المراجعة، يجب موافقة الإدارة أولاً', 403);
        }
    }

    private function availabilityState(Tournament $tournament, int $remaining): string
    {
        if (in_array($tournament->status, [Tournament::STATUS_DRAFT, Tournament::STATUS_OPEN_FOR_REGISTRATION], true)) {
            if (! $tournament->registrationWindowOpen() && $tournament->status === Tournament::STATUS_OPEN_FOR_REGISTRATION) {
                if ($tournament->registration_start_at && $tournament->registration_start_at->isFuture()) {
                    return 'not_started';
                }

                return 'closed';
            }

            if ($remaining <= 0) {
                return 'full';
            }

            return 'open';
        }

        if ($tournament->status === Tournament::STATUS_REGISTRATION_CLOSED) {
            return 'closed';
        }

        return 'started';
    }

    private function resolveTournament(string $key): Tournament
    {
        $decodedKey = rawurldecode($key);
        $tournament = is_numeric($key)
            ? Tournament::query()->whereKey((int) $key)->first()
            : Tournament::query()
                ->where('slug', $key)
                ->orWhere('slug', $decodedKey)
                ->orWhere('uuid', $key)
                ->first();

        $user = request()->user();
        $isOwnerOrAdmin = $user && ($user->role === 'admin' || ($tournament && (int) $user->id === (int) $tournament->organizer_id));

        if (! $tournament || (! $isOwnerOrAdmin && ! $tournament->isVisiblePublicly())) {
            abort(404, 'البطولة غير موجودة أو غير منشورة');
        }

        return $tournament;
    }
}
