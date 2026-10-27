<?php

namespace App\Http\Controllers\Public;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PublicRegisteredTeamsController extends Controller
{
    /**
     * Return list of genuinely registered teams on the platform.
     */
    public function index(Request $request): JsonResponse
    {
        $city = $request->query('city');
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);

        $query = Team::query()
            ->with([
                'manager:id,name,phone,is_whatsapp,status',
                'primaryStadium:id,name,city,player_format,price_per_team',
            ])
            ->whereHas('manager', fn ($q) => $q->where('status', 'approved'))
            ->when($city && $city !== 'all', fn ($q) => $q->where('city', $city))
            ->orderByDesc('points')
            ->orderByDesc('matches_played')
            ->orderBy('name');

        $paginated = $query->paginate($perPage);

        $teams = collect($paginated->items())->map(function (Team $team) {
            $manager = $team->manager;
            $isOnline = $manager ? $manager->isOnline() : false;

            // Normalize Moroccan phone number for display & WhatsApp
            $formattedPhone = null;
            $waPhone = null;
            if ($manager && $manager->phone) {
                $rawPhone = preg_replace('/\D+/', '', $manager->phone);
                if (str_starts_with($rawPhone, '0')) {
                    $rawPhone = '212' . substr($rawPhone, 1);
                } elseif (str_starts_with($rawPhone, '212')) {
                    // already international
                } else {
                    $rawPhone = '212' . $rawPhone;
                }
                $formattedPhone = '+' . $rawPhone;
                $waPhone = $rawPhone;
            }

            return [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city ?: ($team->primaryStadium?->city ?: 'المغرب'),
                'logo_url' => $team->logo_url,
                'points' => (int) $team->points,
                'matches_played' => (int) $team->matches_played,
                'wins' => (int) $team->wins,
                'draws' => (int) $team->draws,
                'losses' => (int) $team->losses,
                'member_count' => (int) $team->member_count,
                'primary_color' => $team->primary_color ?: '#10B981',
                'secondary_color' => $team->secondary_color ?: '#0F172A',
                'primary_stadium' => $team->primaryStadium ? [
                    'id' => $team->primaryStadium->id,
                    'name' => $team->primaryStadium->name,
                    'city' => $team->primaryStadium->city,
                    'player_format' => $team->primaryStadium->player_format,
                    'price_per_team' => $team->primaryStadium->price_per_team,
                ] : null,
                'manager' => $manager ? [
                    'id' => $manager->id,
                    'name' => $manager->name,
                    'phone' => $formattedPhone,
                    'wa_phone' => $waPhone,
                    'is_whatsapp' => (bool) $manager->is_whatsapp,
                    'is_online' => $isOnline,
                ] : null,
                'manager_online' => $isOnline,
                'is_challengeable' => $isOnline,
            ];
        });

        return response()->json([
            'data' => $teams,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Validate challenge parameters and prepare verified WhatsApp challenge link.
     */
    public function validateChallenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_team_id' => 'required|exists:teams,id',
            'stadium_id' => 'required|exists:stadiums,id',
            'match_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'challenger_name' => 'nullable|string|max:100',
            'challenger_team_name' => 'nullable|string|max:100',
        ]);

        $team = Team::with(['manager', 'primaryStadium'])->findOrFail($validated['target_team_id']);
        $manager = $team->manager;

        if (! $manager || $manager->status !== 'approved') {
            return response()->json([
                'message' => 'هذا الفريق غير مؤهل للمباريات الودية حالياً.',
            ], 422);
        }

        // 1. Strict Team-Manager Online Requirement
        if (! $manager->isOnline()) {
            return response()->json([
                'message' => 'مسير الفريق غير متصل حالياً. لا يمكن إرسال التحدي إلا عندما يكون مسير الفريق متصلاً.',
                'manager_online' => false,
            ], 422);
        }

        // 2. Validate pitch availability against real database bookings
        $stadium = Stadium::findOrFail($validated['stadium_id']);
        $matchDate = Carbon::parse($validated['match_date'])->toDateString();
        $startTime = $validated['start_time'];
        $endTime = $validated['end_time'];

        $hasConflict = TerrainBooking::query()
            ->where('terrain_id', $stadium->id)
            ->where('booking_date', $matchDate)
            ->whereIn('status', ['confirmed', 'approved', 'pending'])
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where(function ($sub) use ($startTime, $endTime) {
                    $sub->where('start_time', '<', $endTime)
                        ->where('end_time', '>', $startTime);
                });
            })
            ->exists();

        if ($hasConflict) {
            return response()->json([
                'message' => 'توقيت الملعب المحدد محجوز مسبقاً. يرجى اختيار موعد أو توقيت آخر متاح.',
                'slot_conflict' => true,
            ], 422);
        }

        // 3. Normalize Moroccan Phone Number
        $rawPhone = $manager->phone ? preg_replace('/\D+/', '', $manager->phone) : '';
        if ($rawPhone) {
            if (str_starts_with($rawPhone, '0')) {
                $rawPhone = '212' . substr($rawPhone, 1);
            } elseif (! str_starts_with($rawPhone, '212')) {
                $rawPhone = '212' . $rawPhone;
            }
        }

        $challengerTitle = $validated['challenger_team_name']
            ?: ($validated['challenger_name'] ?: 'فريق رياضي عبر منصة أجي نقصرو');

        // Pure Standard Arabic challenge invitation (strictly without false claims of confirmation)
        $messageText = "السلام عليكم ورحمة الله،\n"
            . "أود دعوتكم لمباراة ودية ضد فريق: {$challengerTitle}\n\n"
            . "🏟️ الملعب: {$stadium->name} ({$stadium->city})\n"
            . "📅 التاريخ: {$matchDate}\n"
            . "⏰ التوقيت: من {$startTime} إلى {$endTime}\n\n"
            . "📌 ملاحظة: هذا طلب تحدٍ لمباراة ودية بانتظار موافقتكم وتأكيد الحجز النهائي عبر منصة أجي نقصرو.";

        $whatsappUrl = $rawPhone
            ? "https://wa.me/{$rawPhone}?text=" . rawurlencode($messageText)
            : null;

        return response()->json([
            'ok' => true,
            'whatsapp_url' => $whatsappUrl,
            'phone' => $rawPhone ? '+' . $rawPhone : null,
            'message_text' => $messageText,
            'target_team' => [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'manager_name' => $manager->name,
            ],
            'stadium' => [
                'id' => $stadium->id,
                'name' => $stadium->name,
                'city' => $stadium->city,
            ],
            'booking_details' => [
                'date' => $matchDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
            ],
        ]);
    }
}
