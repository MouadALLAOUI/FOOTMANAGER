<?php

namespace App\Domains\Shared\ValueObjects;

class Score
{
    public function __construct(
        public readonly int $home,
        public readonly int $away,
    ) {}

    public static function zero(): self
    {
        return new self(0, 0);
    }

    public function isDraw(): bool
    {
        return $this->home === $this->away;
    }

    public function homeWins(): bool
    {
        return $this->home > $this->away;
    }

    public function awayWins(): bool
    {
        return $this->away > $this->home;
    }

    public function toString(): string
    {
        return $this->home.'-'.$this->away;
    }

    public function toArray(): array
    {
        return ['home' => $this->home, 'away' => $this->away];
    }
}
