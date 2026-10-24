<?php

namespace App\Domains\Tournament\Exceptions;

use App\Domains\Shared\Exceptions\DomainException;

class SchedulingWarningException extends DomainException
{
    public function __construct(
        string $message,
        private readonly string $warningCode = 'scheduling_warning',
        private readonly string $warningTitle = 'تحذير في برمجة المباراة',
        private readonly ?string $affectedTeam = null,
        private readonly array $extra = [],
        int $code = 422
    ) {
        parent::__construct($message, $code);
    }

    public function getErrorPayload(): array
    {
        return array_merge([
            'requires_override' => true,
            'warning_code' => $this->warningCode,
            'warning_title' => $this->warningTitle,
            'affected_team' => $this->affectedTeam,
        ], $this->extra);
    }

    public function getWarningCode(): string
    {
        return $this->warningCode;
    }

    public function getWarningTitle(): string
    {
        return $this->warningTitle;
    }

    public function getAffectedTeam(): ?string
    {
        return $this->affectedTeam;
    }
}
