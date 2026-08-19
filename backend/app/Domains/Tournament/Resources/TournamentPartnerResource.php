<?php

namespace App\Domains\Tournament\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TournamentPartnerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo_url' => $this->logo_url,
            'link' => $this->link,
            'order_index' => $this->order_index,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
