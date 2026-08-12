<?php

namespace App\Domains\Social\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'counts' => $this['counts'] ?? [],
            'total' => $this['total'] ?? 0,
            'my_reaction' => $this['my_reaction'] ?? null,
        ];
    }
}
