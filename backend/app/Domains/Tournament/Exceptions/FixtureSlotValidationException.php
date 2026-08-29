<?php

namespace App\Domains\Tournament\Exceptions;

use App\Domains\Shared\Exceptions\DomainException;

class FixtureSlotValidationException extends DomainException
{
    /**
     * @param  array{fixture_id: int, side: string, team_id: int, message: string}  $slot
     */
    public function __construct(string $message, private readonly array $slot)
    {
        parent::__construct($message, 422);
    }

    /**
     * @return array<int, array{fixture_id: int, side: string, team_id: int, message: string}>
     */
    public function getErrorPayload(): array
    {
        return [$this->slot];
    }
}