<?php

namespace App\Domains\Social\Resources;

use Illuminate\Http\Request;

class ReplyResource extends CommentResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request);
    }
}
