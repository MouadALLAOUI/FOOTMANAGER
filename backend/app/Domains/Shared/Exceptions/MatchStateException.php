<?php

namespace App\Domains\Shared\Exceptions;

use RuntimeException;

class MatchStateException extends RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message, 409);
    }
}
