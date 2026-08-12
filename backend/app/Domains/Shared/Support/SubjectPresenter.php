<?php

namespace App\Domains\Shared\Support;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class SubjectPresenter
{
    public static function summarize(?Model $model): ?array
    {
        if (! $model) {
            return null;
        }

        if ($model instanceof User) {
            return [
                'type' => 'user',
                'id' => $model->id,
                'name' => $model->name,
                'role' => $model->role,
                'image_url' => null,
            ];
        }

        if ($model instanceof Team) {
            return [
                'type' => 'team',
                'id' => $model->id,
                'name' => $model->name,
                'image_url' => $model->logo_url,
            ];
        }

        if ($model instanceof Player) {
            return [
                'type' => 'player',
                'id' => $model->id,
                'name' => $model->name,
                'position' => $model->position,
                'team_id' => $model->team_id,
                'image_url' => null,
            ];
        }

        if ($model instanceof Stadium) {
            return [
                'type' => 'stadium',
                'id' => $model->id,
                'name' => $model->name,
                'city' => $model->city,
                'image_url' => $model->cover_image_url,
            ];
        }

        if ($model instanceof FootballMatch) {
            return [
                'type' => 'match',
                'id' => $model->id,
                'uuid' => $model->uuid,
                'home_team_id' => $model->home_team_id,
                'away_team_id' => $model->away_team_id,
                'home_score' => $model->home_score,
                'away_score' => $model->away_score,
                'status' => $model->status?->value,
            ];
        }

        return [
            'type' => strtolower(class_basename($model)),
            'id' => $model->getKey(),
            'name' => $model->getAttribute('name') ?? $model->getAttribute('title') ?? null,
        ];
    }
}
