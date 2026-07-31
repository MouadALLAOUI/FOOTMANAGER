<?php

namespace App\Http\Requests;

use App\Rules\NoOverlappingBooking;
use Illuminate\Foundation\Http\FormRequest;

class DirectBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'terrain_id' => 'required|exists:stadiums,id',
            'reservation_type' => 'required|in:single,weekly_subscription',
            'booking_date' => 'required_if:reservation_type,single|date|after_or_equal:today',
            'day_of_week' => 'required_if:reservation_type,weekly_subscription|nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'required_if:reservation_type,weekly_subscription|nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'purpose' => 'required|in:training,private',
            'notes' => 'nullable|string|max:500',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $terrainId = $this->terrain_id;

            $terrain = \App\Models\Stadium::find($terrainId);
            if ($terrain && !$terrain->is_open) {
                $validator->errors()->add('terrain_id', 'الملعب مغلق حالياً — لا يمكن الحجز');
            }

            $team = $this->user()?->team;
            if (!$team) {
                $validator->errors()->add('team', 'يجب إنشاء ملف الفريق أولاً');
            }

            if (!$validator->errors()->any() && $terrain) {
                $date = $this->reservation_type === 'weekly_subscription'
                    ? $this->start_date
                    : $this->booking_date;

                if ($date) {
                    $hasConflict = \App\Models\TerrainBooking::checkConflict(
                        $terrainId,
                        $date,
                        $this->start_time,
                        $this->end_time
                    );
                    if ($hasConflict) {
                        $validator->errors()->add('time_slot', 'هذا الوقت محجوز بالفعل في التاريخ المحدد');
                    }
                }
            }
        });
    }
}
