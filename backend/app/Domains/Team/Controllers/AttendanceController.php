<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Resources\AttendanceResource;
use App\Domains\Team\Services\AttendanceService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private AttendanceService $service,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageAttendance', $team);

        $validated = $request->validate([
            'match_request_id' => 'sometimes|nullable|integer|exists:match_requests,id',
            'session_date' => 'sometimes|nullable|date',
            'records' => 'required|array|min:1',
            'records.*.player_id' => 'required|integer',
            'records.*.status' => 'required|in:'.implode(',', [Attendance::PRESENT, Attendance::ABSENT, Attendance::LATE, Attendance::EXCUSED]),
            'records.*.notes' => 'sometimes|nullable|string|max:255',
        ]);

        $result = $this->service->store($team, $request->user(), $validated);

        return response()->json([
            'message' => 'تم تسجيل الحضور بنجاح!',
            'data' => AttendanceResource::collection($result['records']),
            'player_summary' => $result['summary'],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewAttendance', $team);

        $validated = $request->validate([
            'player_id' => 'sometimes|nullable|integer',
            'match_request_id' => 'sometimes|nullable|integer',
            'status' => 'sometimes|nullable|in:'.implode(',', [Attendance::PRESENT, Attendance::ABSENT, Attendance::LATE, Attendance::EXCUSED]),
            'from' => 'sometimes|nullable|date',
            'to' => 'sometimes|nullable|date',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        $result = $this->service->index($team, $validated, $validated['per_page'] ?? 15);

        return response()->json([
            'data' => AttendanceResource::collection($result['records']),
            'meta' => [
                'current_page' => $result['records']->currentPage(),
                'last_page' => $result['records']->lastPage(),
                'per_page' => $result['records']->perPage(),
                'total' => $result['records']->total(),
            ],
            'player_summary' => $result['player_summary'],
        ]);
    }
}
