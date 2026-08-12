<?php

namespace App\Domains\Stadium\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StadiumResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'type' => $this->type,
            'city' => $this->city,
            'address' => $this->address,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'player_format' => $this->player_format,
            'is_covered' => (bool) $this->is_covered,
            'capacity' => $this->capacity,
            'price_per_hour' => $this->price_per_hour !== null ? (float) $this->price_per_hour : null,
            'price_per_team' => $this->price_per_team !== null ? (float) $this->price_per_team : null,
            'total_price' => $this->total_price !== null ? (float) $this->total_price : null,
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'reviews_count' => $this->reviews_count,
            'is_open' => (bool) $this->is_open,
            'is_available' => (bool) $this->is_available,
            'google_maps_url' => $this->google_maps_url,
            'cover_image_url' => $this->cover_image_url,
            'images' => $this->whenLoaded('images', fn () => $this->images->pluck('image_url')),
            'facilities' => $this->whenLoaded('facilities', fn () => $this->facilities->pluck('name')),
            'distance' => $this->when(isset($this->distance), fn () => round((float) $this->distance, 2)),
        ];
    }
}
