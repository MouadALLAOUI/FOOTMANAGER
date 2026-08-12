<?php

namespace App\Domains\Social\Resources;

use App\Domains\Shared\Support\SubjectPresenter;
use App\Domains\Social\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof Favorite) {
            return [
                'id' => $this->id,
                'favoritable' => $this->whenLoaded('favoritable', fn () => SubjectPresenter::summarize($this->favoritable)),
                'created_at' => $this->created_at?->toIso8601String(),
            ];
        }

        return [
            'is_favorite' => (bool) ($this['is_favorite'] ?? false),
        ];
    }
}
