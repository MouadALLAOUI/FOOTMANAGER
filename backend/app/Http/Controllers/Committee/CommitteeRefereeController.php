<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Match\Models\Referee;
use App\Domains\Shared\Base\Controller;
use App\Http\Requests\Committee\StoreRefereeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeRefereeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $referees = Referee::query()
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%"))
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'phone', 'position', 'user_id']);

        return response()->json(['data' => $referees]);
    }

    public function store(StoreRefereeRequest $request): JsonResponse
    {
        $referee = Referee::query()->create([
            'name' => trim($request->input('name')),
            'phone' => $request->input('phone') ? trim($request->input('phone')) : null,
            'position' => $request->input('position') ?: null,
            'user_id' => $request->input('user_id') ?: null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $referee->only(['id', 'name', 'phone', 'position', 'user_id']),
            'message' => 'تمت إضافة الحكم',
        ], 201);
    }
}
