<?php

namespace App\Domains\Booking\Policies;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Player\Models\Player;
use App\Models\User;

class TerrainBookingPolicy
{
    public function create(User $user): bool
    {
        return $user->role === 'manager'
            && $user->status === 'approved'
            && $user->team !== null;
    }

    public function view(User $user, TerrainBooking $booking): bool
    {
        if ((int) $user->id === (int) $booking->manager_id
            || (int) $user->id === (int) $booking->terrain?->owner_id) {
            return true;
        }

        return Player::query()
            ->active()
            ->where('user_id', $user->id)
            ->pluck('team_id')
            ->contains($booking->team_id);
    }

    public function requestPayment(User $user, TerrainBooking $booking): bool
    {
        return $this->view($user, $booking)
            && in_array($booking->status, ['pending', 'confirmed', 'approved'], true);
    }

    public function cancel(User $user, TerrainBooking $booking): bool
    {
        return (int) $user->id === (int) $booking->manager_id
            && $booking->isCancelable();
    }

    public function viewReceipt(User $user, TerrainBooking $booking): bool
    {
        return $this->view($user, $booking);
    }
}
