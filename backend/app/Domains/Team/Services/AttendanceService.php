<?php

namespace App\Domains\Team\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\AttendanceRecorded;
use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceService
{
    public function __construct(
        private PlayerStatisticsService $playerStatistics,
    ) {}

    public function store(Team $team, User $recorder, array $data): array
    {
        $records = $data['records'] ?? [];

        if (empty($records)) {
            throw ValidationException::withMessages(['records' => 'يجب إدخال سجلات الحضور على الأقل للاعب واحد']);
        }

        $playerIds = array_column($records, 'player_id');

        $validPlayers = Player::where('team_id', $team->id)
            ->whereIn('id', $playerIds)
            ->pluck('id')
            ->all();

        $missing = array_diff($playerIds, $validPlayers);

        if ($missing) {
            throw ValidationException::withMessages(['records' => 'بعض اللاعبين غير موجودين في الفريق']);
        }

        if (! empty($data['match_request_id'])) {
            $matchExists = MatchRequest::whereKey($data['match_request_id'])
                ->where(fn ($q) => $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id))
                ->exists();

            if (! $matchExists) {
                throw ValidationException::withMessages(['match_request_id' => 'المباراة غير مرتبطة بهذا الفريق']);
            }
        }

        if (empty($data['match_request_id']) && empty($data['session_date'])) {
            throw ValidationException::withMessages(['session_date' => 'يجب تحديد المباراة أو تاريخ الجلسة']);
        }

        $saved = DB::transaction(function () use ($team, $recorder, $records, $data) {
            $output = [];

            foreach ($records as $record) {
                $validStatuses = [Attendance::PRESENT, Attendance::ABSENT, Attendance::LATE, Attendance::EXCUSED];
                $status = in_array($record['status'] ?? null, $validStatuses, true)
                    ? $record['status']
                    : Attendance::PRESENT;

                $attendance = Attendance::updateOrCreate(
                    [
                        'player_id' => $record['player_id'],
                        'match_request_id' => $data['match_request_id'] ?? null,
                        'session_date' => ! empty($data['match_request_id']) ? null : ($data['session_date'] ?? null),
                    ],
                    [
                        'team_id' => $team->id,
                        'status' => $status,
                        'recorded_by' => $recorder->id,
                        'notes' => $record['notes'] ?? null,
                    ]
                );

                $output[] = $attendance->load('player:id,name,number');
            }

            return $output;
        });

        TeamCache::flushTeam($team->id);

        event(new AttendanceRecorded($team, $data['match_request_id'] ?? null, $data['session_date'] ?? null, $saved, $recorder));

        return [
            'records' => $saved,
            'summary' => $this->playerStatistics->summaries($team),
        ];
    }

    public function index(Team $team, array $filters, int $perPage = 15): array
    {
        $query = Attendance::query()
            ->with(['player:id,name,number,status', 'matchRequest:id,match_datetime,status'])
            ->where('team_id', $team->id);

        if (! empty($filters['player_id'])) {
            $query->where('player_id', $filters['player_id']);
        }

        if (! empty($filters['match_request_id'])) {
            $query->where('match_request_id', $filters['match_request_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['from'])) {
            $query->whereDate('session_date', '>=', $filters['from']);
        }

        if (! empty($filters['to'])) {
            $query->whereDate('session_date', '<=', $filters['to']);
        }

        $records = $query->latest('created_at')->paginate($perPage);

        return [
            'records' => $records,
            'player_summary' => $this->playerStatistics->summaries($team),
        ];
    }
}
