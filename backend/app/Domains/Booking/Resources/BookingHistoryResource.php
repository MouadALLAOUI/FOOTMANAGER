<?php

namespace App\Domains\Booking\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return (new BookingResource($this->resource))->toArray($request);
    }
}
