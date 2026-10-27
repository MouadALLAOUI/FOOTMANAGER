<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class TeamProfileController extends Controller
{
    public function show(Team $team): JsonResponse
    {
        $dayNames = [
            0 => 'الأحد',
            1 => 'الاثنين',
            2 => 'الثلاثاء',
            3 => 'الأربعاء',
            4 => 'الخميس',
            5 => 'الجمعة',
            6 => 'السبت',
        ];

        // Fetch active approved bookings & weekly subscriptions for this team
        $weeklyBookings = $team->terrainBookings()
            ->whereIn('status', ['approved', 'confirmed'])
            ->whereNull('archived_at')
            ->with('terrain')
            ->get()
            ->map(function ($b) use ($dayNames) {
                $dow = $b->day_of_week ?? ($b->booking_date ? Carbon::parse($b->booking_date)->dayOfWeek : null);
                $dayName = ($dow !== null && isset($dayNames[$dow])) ? $dayNames[$dow] : null;

                return [
                    'id' => $b->id,
                    'reservation_type' => $b->reservation_type,
                    'is_weekly' => $b->isWeeklySubscription(),
                    'day_of_week' => $dow,
                    'day_name' => $dayName,
                    'start_time' => $b->start_time ? substr($b->start_time, 0, 5) : null,
                    'end_time' => $b->end_time ? substr($b->end_time, 0, 5) : null,
                    'booking_date' => $b->booking_date ? Carbon::parse($b->booking_date)->toDateString() : null,
                    'start_date' => $b->start_date ? Carbon::parse($b->start_date)->toDateString() : null,
                    'end_date' => $b->end_date ? Carbon::parse($b->end_date)->toDateString() : null,
                    'terrain' => $b->terrain ? [
                        'id' => $b->terrain->id,
                        'name' => $b->terrain->name,
                        'city' => $b->terrain->city,
                    ] : null,
                ];
            });

        if ($team->visibility !== 'public') {
            // Private teams keep a public identity (name, logo, city, category)
            // so opponents can recognize them; everything else stays gated.
            return response()->json([
                'team' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'city' => $team->city,
                    'category' => $team->category,
                    'level' => $team->level,
                    'founded_year' => $team->founded_year,
                    'logo_url' => $team->logo_url,
                    'logo_thumbnail_url' => $team->logo_thumbnail_url,
                    'primary_color' => $team->primary_color,
                    'secondary_color' => $team->secondary_color,
                    'visibility' => $team->visibility,
                    'weekly_bookings' => $weeklyBookings,
                ],
            ]);
        }

        $team->load('manager');

        return response()->json([
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'category' => $team->category,
                'level' => $team->level,
                'founded_year' => $team->founded_year,
                'member_count' => $team->member_count,
                'max_squad_size' => $team->max_squad_size,
                'association_name' => $team->association_name,
                'description' => $team->description,
                'primary_color' => $team->primary_color,
                'secondary_color' => $team->secondary_color,
                'logo_url' => $team->logo_url,
                'logo_thumbnail_url' => $team->logo_thumbnail_url,
                'cover_image_url' => $team->cover_image_url,
                'players_count' => $team->players()->count(),
                'points' => $team->points,
                'matches_played' => $team->matches_played,
                'wins' => $team->wins,
                'draws' => $team->draws,
                'losses' => $team->losses,
                'goals_for' => $team->goals_for,
                'goals_against' => $team->goals_against,
                'goal_difference' => $team->goal_difference,
                'created_at' => $team->created_at,
                'weekly_bookings' => $weeklyBookings,
                'manager' => $team->manager ? [
                    'id' => $team->manager->id,
                    'name' => $team->manager->name,
                    'avatar_url' => $team->manager->avatar_url,
                    'city' => $team->manager->city,
                ] : null,
            ],
        ]);
    }
}
