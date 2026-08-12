<?php

namespace App\Domains\Match\Enums;

enum MatchEventType: string
{
    case Goal = 'goal';
    case OwnGoal = 'own_goal';
    case PenaltyGoal = 'penalty_goal';
    case MissedPenalty = 'missed_penalty';
    case Assist = 'assist';
    case YellowCard = 'yellow_card';
    case RedCard = 'red_card';
    case Substitution = 'substitution';
    case Injury = 'injury';
    case Timeout = 'timeout';
    case HalfTime = 'half_time';
    case SecondHalf = 'second_half';
    case Kickoff = 'kickoff';
    case MatchEnd = 'match_end';
    case Var = 'var';
    case Other = 'other';

    public function icon(): string
    {
        return match ($this) {
            self::Goal, self::PenaltyGoal => 'goal',
            self::OwnGoal => 'own-goal',
            self::MissedPenalty => 'missed-penalty',
            self::Assist => 'assist',
            self::YellowCard => 'yellow-card',
            self::RedCard => 'red-card',
            self::Substitution => 'substitution',
            self::Injury => 'injury',
            self::Timeout => 'timeout',
            self::HalfTime => 'half-time',
            self::SecondHalf => 'second-half',
            self::Kickoff => 'kickoff',
            self::MatchEnd => 'full-time',
            self::Var => 'var',
            self::Other => 'other',
        };
    }

    public function affectsScore(): bool
    {
        return in_array($this, [self::Goal, self::OwnGoal, self::PenaltyGoal], true);
    }
}
