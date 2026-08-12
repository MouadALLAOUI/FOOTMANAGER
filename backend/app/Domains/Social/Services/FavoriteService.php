<?php

namespace App\Domains\Social\Services;

use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Models\Favorite;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

class FavoriteService
{
    public function add(User $user, Model $target): array
    {
        Favorite::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'favoritable_type' => $target->getMorphClass(),
                'favoritable_id' => $target->getKey(),
            ],
        );

        return $this->status($user, $target);
    }

    public function remove(User $user, Model $target): array
    {
        Favorite::query()
            ->where('user_id', $user->id)
            ->where('favoritable_type', $target->getMorphClass())
            ->where('favoritable_id', $target->getKey())
            ->delete();

        return $this->status($user, $target);
    }

    public function isFavorite(User $user, Model $target): bool
    {
        return Favorite::query()
            ->where('user_id', $user->id)
            ->where('favoritable_type', $target->getMorphClass())
            ->where('favoritable_id', $target->getKey())
            ->exists();
    }

    public function list(User $user, ?string $type = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = Favorite::query()
            ->with('favoritable')
            ->where('user_id', $user->id);

        if ($type) {
            $class = MorphMap::classFor($type);

            if ($class) {
                $query->where('favoritable_type', (new $class)->getMorphClass());
            }
        }

        return $query->latest()->paginate($perPage);
    }

    public function status(User $user, Model $target): array
    {
        return [
            'is_favorite' => $this->isFavorite($user, $target),
        ];
    }
}
