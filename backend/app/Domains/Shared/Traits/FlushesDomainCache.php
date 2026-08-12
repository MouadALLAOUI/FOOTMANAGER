<?php

namespace App\Domains\Shared\Traits;

use Illuminate\Support\Facades\Cache;

trait FlushesDomainCache
{
    protected static array $flushTags = [];

    public static function bootFlushesDomainCache(): void
    {
        static::saved(function ($model) {
            foreach (static::$flushTags as $tag) {
                Cache::forget($tag);
            }

            foreach (static::cacheTagsFor($model) as $tag) {
                Cache::forget($tag);
            }
        });
    }

    protected static function cacheTagsFor($model): array
    {
        return [];
    }
}
