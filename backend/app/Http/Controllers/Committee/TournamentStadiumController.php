<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentStadium;
use App\Http\Requests\Committee\UpdateTournamentStadiumsRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TournamentStadiumController extends Controller
{
    use AuthorizesRequests;

    public function index(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        $stadiums = $tournament->stadiums()->orderBy('name')->get(['id', 'name', 'city']);

        return response()->json([
            'data' => [
                'main_stadium_id' => $tournament->stadium_id,
                'stadiums' => $stadiums->map(fn ($stadium) => [
                    'id' => $stadium->id,
                    'name' => $stadium->name,
                    'city' => $stadium->city,
                    'is_main' => (int) $tournament->stadium_id === (int) $stadium->id,
                ])->all(),
            ],
        ]);
    }

    public function store(UpdateTournamentStadiumsRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status !== 'draft') {
            throw new DomainException('لا يمكن تعديل الملاعب بعد انطلاق البطولة');
        }

        $data = $request->validated();

        DB::transaction(function () use ($tournament, $data) {
            TournamentStadium::query()->where('tournament_id', $tournament->id)->delete();

            foreach ($data['stadium_ids'] as $stadiumId) {
                TournamentStadium::query()->firstOrCreate([
                    'tournament_id' => $tournament->id,
                    'stadium_id' => $stadiumId,
                ]);
            }

            $tournament->forceFill([
                'stadium_id' => $data['main_stadium_id'] ?? null,
            ])->save();
        });

        return response()->json(['message' => 'تم تحديث الملاعب']);
    }
}
