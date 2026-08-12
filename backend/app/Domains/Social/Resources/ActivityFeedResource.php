<?php

namespace App\Domains\Social\Resources;

use App\Domains\Shared\Support\SubjectPresenter;
use App\Domains\Social\Models\Reaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityFeedResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $reactions = null;

        if ($this->relationLoaded('reactions')) {
            $counts = [];
            $total = 0;

            foreach ($this->reactions as $reaction) {
                $counts[$reaction->type] = ($counts[$reaction->type] ?? 0) + 1;
                $total++;
            }

            $reactions = [
                'counts' => array_merge(array_fill_keys(Reaction::TYPES, 0), $counts),
                'total' => $total,
                'my_reaction' => $this->my_reaction ?? null,
            ];
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'actor' => SubjectPresenter::summarize($this->actor),
            'subject' => SubjectPresenter::summarize($this->subject),
            'data' => $this->data,
            'image_url' => $this->image_url,
            'reactions' => $reactions,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
