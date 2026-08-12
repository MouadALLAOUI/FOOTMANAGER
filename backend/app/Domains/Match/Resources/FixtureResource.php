<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FixtureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->resource['id'],
            'match_datetime' => $this->resource['match_datetime'],
            'date' => $this->resource['date'],
            'time' => $this->resource['time'],
            'opponent' => $this->resource['opponent'],
            'stadium' => $this->resource['stadium'],
            'city' => $this->resource['city'],
            'competition' => $this->resource['competition'],
            'status' => $this->resource['status'],
            'is_home' => $this->resource['is_home'],
        ];

        if (isset($this->resource['score'])) {
            $data['score'] = $this->resource['score'];
            $data['result'] = $this->resource['result'];
            $data['goals_for'] = $this->resource['goals_for'];
            $data['goals_against'] = $this->resource['goals_against'];
            $data['player_ratings'] = $this->resource['player_ratings'];
            $data['mvp'] = $this->resource['mvp'];
        }

        return $data;
    }
}
