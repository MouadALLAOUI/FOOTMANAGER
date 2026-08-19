<?php

namespace Database\Seeders;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Default data — always seeded (admin user + facilities)
        $this->call(PermissionSeeder::class);
        $this->call(AdminSeeder::class);
        $this->call(FacilitySeeder::class);
        $this->call(SettingsSeeder::class);
        $this->call(AchievementSeeder::class);
        $this->call(PublicApiBackfillSeeder::class);
        $this->call(PlanSeeder::class);
        $this->call(FeatureSeeder::class);
        $this->call(PlanFeatureSeeder::class);
        $this->call(BackfillBronzeSubscriptionsSeeder::class);

        // Factories and demo data are for local/development only
        if (app()->environment('production')) {
            return;
        }

        // Test Terrain Owner — always accessible after migration
        $testTerrainOwner = User::create([
            'name' => 'صاحب تيران تجريبي',
            'email' => 'terrain@footmanager.com',
            'phone' => '0600000001',
            'is_whatsapp' => true,
            'password' => bcrypt('password'),
            'role' => 'terrain_owner',
            'status' => 'approved',
        ]);

        $testTerrain = Stadium::create([
            'name' => 'تيران الرياضة - الدار البيضاء',
            'city' => 'الدار البيضاء',
            'address' => 'شارع محمد الخامس، حي السالمية',
            'owner_id' => $testTerrainOwner->id,
            'type' => 'minifoot',
            'player_format' => '7v7',
            'has_benches' => true,
            'supports_tournaments' => true,
            'has_lighting' => true,
            'has_vestiaires' => true,
            'price_per_team' => 200,
            'total_price' => 400,
            'is_available' => true,
            'is_open' => true,
        ]);

        $testTerrain2 = Stadium::create([
            'name' => 'قاعة مغطاة الأمل',
            'city' => 'الدار البيضاء',
            'address' => 'شارع الجيش الملكي، حي النصر',
            'owner_id' => $testTerrainOwner->id,
            'type' => 'salle',
            'player_format' => '5v5',
            'has_benches' => true,
            'supports_tournaments' => false,
            'has_lighting' => true,
            'has_vestiaires' => true,
            'price_per_team' => 300,
            'total_price' => 600,
            'is_available' => true,
            'is_open' => true,
        ]);

        // Test Manager — always accessible after migration
        $testManager = User::create([
            'name' => 'مدير تجريبي',
            'email' => 'manager@footmanager.com',
            'phone' => '0555000000',
            'is_whatsapp' => true,
            'password' => bcrypt('password'),
            'role' => 'manager',
            'status' => 'approved',
        ]);

        $testTeam = Team::create([
            'name' => 'فريق التجربة FC',
            'member_count' => 18,
            'category' => 'adult',
            'association_name' => 'الجمعية الرياضية للتجربة',
            'city' => 'tinghir',
            'region' => 'kelaa mgouna',
            'primary_color' => '#16a34a',
            'secondary_color' => '#ffffff',
            'points' => 12,
            'matches_played' => 5,
            'wins' => 4,
            'draws' => 0,
            'losses' => 1,
            'goals_for' => 11,
            'goals_against' => 4,
            'goal_difference' => 7,
            'manager_id' => $testManager->id,
        ]);

        // Test Committee — always accessible after migration
        User::create([
            'name' => 'لجنة تنظيمية تجريبية',
            'email' => 'committee@footmanager.com',
            'phone' => '0677000000',
            'is_whatsapp' => true,
            'password' => bcrypt('password'),
            'role' => 'committee',
            'status' => 'approved',
        ]);

        $testPositions = ['goalkeeper', 'defender', 'defender', 'defender', 'midfielder', 'midfielder', 'midfielder', 'forward', 'forward'];
        $testNames = ['أحمد', 'محمد', 'يوسف', 'كريم', 'عمر', 'سعيد', 'عبد الرحمن', 'ياسين', 'خالد'];
        foreach ($testNames as $i => $playerName) {
            Player::create([
                'team_id' => $testTeam->id,
                'name' => $playerName,
                'position' => $testPositions[$i] ?? 'midfielder',
                'number' => $i + 1,
                'phone' => "05550000{$i}0",
                'is_whatsapp' => $i % 2 === 0,
            ]);
        }

        // 10 approved managers with teams
        $managers = User::factory()->approved()->count(10)->create();

        $managers->each(function (User $manager) {
            Team::factory()->create(['manager_id' => $manager->id]);
        });

        // 5 pending managers with teams
        $pending = User::factory()->pending()->count(5)->create();
        $pending->each(function (User $manager) {
            Team::factory()->create(['manager_id' => $manager->id]);
        });

        // 2 rejected managers with teams
        $rejected = User::factory()->rejected()->count(2)->create();
        $rejected->each(function (User $manager) {
            Team::factory()->create(['manager_id' => $manager->id]);
        });

        // 10 stadiums (owned by terrain owner for context)
        // Stadium::factory()->count(8)->create();
        // Stadium::factory()->count(2)->create(['is_available' => false]);

        // 2 pending terrain owners with terrains
        $pendingOwners = User::factory()->terrainOwner()->pending()->count(2)->create();
        $pendingOwners->each(function (User $owner) {
            Stadium::factory()->count(rand(1, 3))->create(['owner_id' => $owner->id]);
        });

        // 2 pending committees + 1 rejected committee (for admin approval demo)
        User::factory()->committee()->pending()->count(2)->create();
        User::factory()->committee()->rejected()->count(1)->create();

        // 1 approved terrain owner (extra)
        $approvedOwner = User::factory()->terrainOwner()->approved()->create();
        Stadium::factory()->count(3)->create(['owner_id' => $approvedOwner->id]);

        // 10 match requests from approved teams (mix of statuses)
        $approvedTeams = Team::whereIn('manager_id', $managers->pluck('id'))->get()->push($testTeam);
        $stadiums = Stadium::all();

        for ($i = 0; $i < 10; $i++) {
            $useCustom = $i % 3 === 0;
            MatchRequest::create([
                'host_team_id' => $approvedTeams->random()->id,
                'opponent_team_id' => $i % 4 === 0 ? null : $approvedTeams->random()->id,
                'stadium_id' => $useCustom ? null : $stadiums->random()->id,
                'custom_terrain_name' => $useCustom ? 'ملعب ' . fake()->city() : null,
                'match_datetime' => now()->addDays(rand(1, 30))->setTime(rand(16, 21), 0),
                'status' => ['open', 'accepted', 'completed', 'cancelled'][$i % 4],
                'notes' => $i % 3 === 0 ? 'يتوفر تحكيم' : null,
                'price_per_player' => $i % 2 === 0 ? [300, 500, 700, 1000][$i % 4] : null,
            ]);
        }

        // Seed completed matches with scores for leaderboard verification
        $this->seedCompletedMatches($approvedTeams);

        // Seed players for approved teams
        $positions = ['goalkeeper', 'defender', 'midfielder', 'forward'];
        foreach ($approvedTeams as $team) {
            $playerCount = rand(5, 12);
            for ($i = 0; $i < $playerCount; $i++) {
                Player::create([
                    'team_id' => $team->id,
                    'name' => fake()->unique()->name(),
                    'position' => fake()->randomElement($positions),
                    'number' => $i + 1,
                    'phone' => fake()->optional(0.6)->numerify('0555#####'),
                    'is_whatsapp' => fake()->boolean(40),
                ]);
            }
        }

        // Seed terrain schedules for test terrains (6 days a week)
        $this->seedTerrainSchedules($testTerrain, $testTerrain2);

        // Seed sample terrain bookings
        $this->seedTerrainBookings($testTerrain, $testTerrain2, $testTeam, $managers);

        // Cancellation policies must be seeded after all stadiums exist to backfill them
        $this->call(CancellationPolicySeeder::class);

        $this->seedPlayers($testTeam);

        // Backfill again so demo users created above also resolve to Bronze
        $this->call(BackfillBronzeSubscriptionsSeeder::class);
    }

    private function seedPlayers(Team $testTeam): void
    {
        if (User::where('role', 'player')->exists()) {
            return;
        }

        // Test Player — always accessible after migration
        $testPlayer = User::create([
            'name' => 'لاعب حر تجريبي',
            'email' => 'player@footmanager.com',
            'phone' => '0666000000',
            'is_whatsapp' => true,
            'password' => bcrypt('password'),
            'role' => 'player',
            'status' => 'approved',
        ]);

        PlayerProfile::create([
            'user_id' => $testPlayer->id,
            'position' => 'forward',
            'skill_level' => 'amateur',
            'birth_year' => 1998,
            'city' => 'الدار البيضاء',
            'description' => 'لاعب حر يبحث عن مباريات في الدار البيضاء',
            'is_available' => true,
            'points' => 6,
            'matches_played' => 2,
            'wins' => 2,
            'draws' => 0,
            'losses' => 0,
            'rating' => 5.0,
        ]);

        // More approved players for the marketplace
        $playerNames = ['أمين الرميلي', 'سفيان بلخير', 'حمزة الفاسي', 'إلياس الشرقاوي', 'مهدي برادة'];
        $positions = ['goalkeeper', 'defender', 'midfielder', 'forward'];
        $skills = ['beginner', 'amateur', 'semi_pro', 'pro'];
        $cities = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة'];

        foreach ($playerNames as $i => $name) {
            $player = User::create([
                'name' => $name,
                'phone' => "06661{$i}{$i}00",
                'is_whatsapp' => true,
                'password' => bcrypt('password'),
                'role' => 'player',
                'status' => $i % 5 === 4 ? 'pending' : 'approved',
            ]);

            PlayerProfile::create([
                'user_id' => $player->id,
                'position' => $positions[$i % 4],
                'skill_level' => $skills[$i % 4],
                'birth_year' => 1995 + $i,
                'city' => $cities[$i],
                'is_available' => true,
                'points' => rand(0, 9),
                'matches_played' => rand(0, 5),
                'wins' => rand(0, 3),
                'draws' => rand(0, 2),
                'losses' => rand(0, 2),
            ]);
        }

        // One pending player application to a test open match
        $openMatch = MatchRequest::where('status', 'open')->first();
        if ($openMatch) {
            PlayerMatchRequest::create([
                'player_id' => $testPlayer->id,
                'match_request_id' => $openMatch->id,
                'type' => 'apply',
                'status' => 'pending',
                'message' => 'سلام، أستطيع اللعب في مركز الهجوم',
            ]);
        }

        // Attach the test player as mercenary to one completed match for the rating demo
        $completedMatch = MatchRequest::where('status', 'completed')->whereNull('mercenary_player_id')->first();
        if ($completedMatch) {
            $completedMatch->update(['mercenary_player_id' => $testPlayer->id]);
        }
    }

    private function seedCompletedMatches($approvedTeams): void
    {
        $matchResults = [
            [3, 1],
            [2, 2],
            [1, 0],
            [0, 3],
            [4, 2],
            [2, 1],
            [1, 1],
            [3, 0],
            [0, 1],
            [2, 0],
            [5, 3],
            [1, 2],
            [0, 0],
            [3, 2],
            [2, 1],
        ];

        foreach ($matchResults as [$hostScore, $oppScore]) {
            $hostTeam = $approvedTeams->random();
            $opponentTeam = $approvedTeams->where('id', '!=', $hostTeam->id)->random();

            $match = MatchRequest::create([
                'host_team_id' => $hostTeam->id,
                'opponent_team_id' => $opponentTeam->id,
                'stadium_id' => Stadium::inRandomOrder()->first()->id,
                'match_datetime' => now()->subDays(rand(1, 30))->setTime(rand(16, 21), 0),
                'status' => 'accepted',
                'host_score' => $hostScore,
                'opponent_score' => $oppScore,
                'score_status' => 'confirmed',
                'score_submitted_by' => $hostTeam->manager_id,
                'price_per_player' => fake()->optional(0.5)->randomElement([200, 400, 500, 800, 1000]),
            ]);

            // Update team standings
            $this->updateTeamStandings($hostTeam, $opponentTeam, $hostScore, $oppScore);
        }
    }

    private function updateTeamStandings(Team $hostTeam, Team $opponentTeam, int $hostScore, int $oppScore): void
    {
        DB::transaction(function () use ($hostTeam, $opponentTeam, $hostScore, $oppScore) {
            // Mark match as completed
            MatchRequest::where('host_team_id', $hostTeam->id)
                ->where('opponent_team_id', $opponentTeam->id)
                ->where('score_status', 'confirmed')
                ->update(['status' => 'completed']);

            // Update host team
            $hostTeam->increment('matches_played');
            $hostTeam->increment('goals_for', $hostScore);
            $hostTeam->increment('goals_against', $oppScore);

            // Update opponent team
            $opponentTeam->increment('matches_played');
            $opponentTeam->increment('goals_for', $oppScore);
            $opponentTeam->increment('goals_against', $hostScore);

            // Determine result
            if ($hostScore > $oppScore) {
                $hostTeam->increment('wins');
                $hostTeam->increment('points', 3);
                $opponentTeam->increment('losses');
            } elseif ($hostScore < $oppScore) {
                $opponentTeam->increment('wins');
                $opponentTeam->increment('points', 3);
                $hostTeam->increment('losses');
            } else {
                $hostTeam->increment('draws');
                $hostTeam->increment('points');
                $opponentTeam->increment('draws');
                $opponentTeam->increment('points');
            }

            // Recalculate goal difference
            $hostTeam->update([
                'goal_difference' => $hostTeam->fresh()->goals_for - $hostTeam->fresh()->goals_against,
            ]);
            $opponentTeam->update([
                'goal_difference' => $opponentTeam->fresh()->goals_for - $opponentTeam->fresh()->goals_against,
            ]);
        });
    }

    private function seedTerrainSchedules(Stadium $terrain1, Stadium $terrain2): void
    {
        // Both terrains open Saturday(6) to Thursday(4), closed Friday(5)
        $openDays = [6, 0, 1, 2, 3, 4]; // Sat-Thu
        foreach ([$terrain1, $terrain2] as $terrain) {
            foreach ($openDays as $day) {
                TerrainSchedule::create([
                    'terrain_id' => $terrain->id,
                    'day_of_week' => $day,
                    'open_time' => '09:00',
                    'close_time' => '23:00',
                    'slot_duration_minutes' => 60,
                    'is_active' => true,
                ]);
            }
        }
    }

    private function seedTerrainBookings(Stadium $terrain1, Stadium $terrain2, Team $testTeam, $managers): void
    {
        $teams = $managers->map(function ($m) {
            return $m->team;
        })->filter()->values();

        if ($teams->isEmpty()) {
            return;
        }

        $today = now()->toDateString();
        $tomorrow = now()->addDay()->toDateString();
        $dayAfter = now()->addDays(2)->toDateString();

        // Booking 1: approved training for test team at terrain1 today
        TerrainBooking::create([
            'terrain_id' => $terrain1->id,
            'manager_id' => $testTeam->manager_id,
            'team_id' => $testTeam->id,
            'booking_type' => 'training',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $today,
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => $terrain1->price_per_team,
            'status' => 'approved',
            'notes' => 'حصّة تدريبية للفئة الكبرى',
        ]);

        // Booking 2: pending training for another team at terrain1 tomorrow
        $otherTeam = $teams->first();
        TerrainBooking::create([
            'terrain_id' => $terrain1->id,
            'manager_id' => $otherTeam->manager_id,
            'team_id' => $otherTeam->id,
            'booking_type' => 'training',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $tomorrow,
            'start_time' => '18:00',
            'end_time' => '19:00',
            'price' => $terrain1->price_per_team,
            'status' => 'pending',
            'notes' => 'حصّة تدريبية خاصة',
        ]);

        // Booking 3: pending private at terrain2 tomorrow
        TerrainBooking::create([
            'terrain_id' => $terrain2->id,
            'manager_id' => $testTeam->manager_id,
            'team_id' => $testTeam->id,
            'booking_type' => 'private',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $tomorrow,
            'start_time' => '20:00',
            'end_time' => '21:00',
            'price' => $terrain2->price_per_team,
            'status' => 'pending',
        ]);

        // Booking 4: approved at terrain2 day after
        TerrainBooking::create([
            'terrain_id' => $terrain2->id,
            'manager_id' => $otherTeam->manager_id,
            'team_id' => $otherTeam->id,
            'booking_type' => 'training',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $dayAfter,
            'start_time' => '16:00',
            'end_time' => '17:00',
            'price' => $terrain2->price_per_team,
            'status' => 'approved',
        ]);

        // Booking 5: weekly subscription (every Monday 20:00-21:00) for test team at terrain1
        TerrainBooking::create([
            'terrain_id' => $terrain1->id,
            'manager_id' => $testTeam->manager_id,
            'team_id' => $testTeam->id,
            'booking_type' => 'training',
            'flow_type' => 'direct',
            'reservation_type' => 'weekly_subscription',
            'booking_date' => now()->startOfWeek(),
            'day_of_week' => 1, // Monday
            'start_date' => now()->startOfWeek()->toDateString(),
            'end_date' => now()->addMonths(1)->toDateString(),
            'start_time' => '20:00',
            'end_time' => '21:00',
            'price' => $terrain1->price_per_team * 4,
            'status' => 'approved',
            'notes' => 'أبونمان أسبوعي — كل يوم اثنين',
        ]);

        // Booking 6: weekly subscription (every Wednesday 19:00-20:00) for other team at terrain2
        TerrainBooking::create([
            'terrain_id' => $terrain2->id,
            'manager_id' => $otherTeam->manager_id,
            'team_id' => $otherTeam->id,
            'booking_type' => 'private',
            'flow_type' => 'direct',
            'reservation_type' => 'weekly_subscription',
            'booking_date' => now()->startOfWeek(),
            'day_of_week' => 3, // Wednesday
            'start_date' => now()->startOfWeek()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'start_time' => '19:00',
            'end_time' => '20:00',
            'price' => $terrain2->price_per_team * 12,
            'status' => 'approved',
            'notes' => 'أبونمان 3 أشهر — كل أربعاء',
        ]);
    }
}