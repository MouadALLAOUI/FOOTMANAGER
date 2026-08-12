<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'name' => $this->resource['name'],
            'position' => $this->resource['position'] ?? null,
            'preferred_position' => $this->resource['preferred_position'] ?? null,
            'number' => $this->resource['number'],
            'phone' => $this->resource['phone'] ?? null,
            'is_whatsapp' => $this->resource['is_whatsapp'] ?? false,
            'role' => $this->resource['effective_role'] ?? ($this->resource['role'] ?? 'reserve'),
            'preferred_foot' => $this->resource['preferred_foot'] ?? null,
            'height_cm' => $this->resource['height_cm'] ?? null,
            'weight_kg' => $this->resource['weight_kg'] ?? null,
            'status' => $this->resource['status'] ?? 'active',
            'emergency_contact' => $this->resource['emergency_contact'] ?? null,
            'joined_at' => $this->resource['joined_at'] ?? null,
            'notes' => $this->resource['notes'] ?? null,
            'user_id' => $this->resource['user_id'] ?? null,
            'created_at' => $this->resource['created_at'] ?? null,
            'attendance_percentage' => $this->resource['attendance_percentage'] ?? null,
            'matches_played' => $this->resource['matches_played'] ?? null,
            'matches_started' => $this->resource['matches_started'] ?? null,
            'missed_matches' => $this->resource['missed_matches'] ?? null,
            'late_count' => $this->resource['late_count'] ?? null,
            'excused_count' => $this->resource['excused_count'] ?? null,
        ];
    }
}
