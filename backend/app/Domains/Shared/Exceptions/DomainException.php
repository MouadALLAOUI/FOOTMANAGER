<?php

namespace App\Domains\Shared\Exceptions;

use RuntimeException;

class DomainException extends RuntimeException
{
    public function __construct(string $message, int $code = 422)
    {
        parent::__construct($message, $code);
    }
}
