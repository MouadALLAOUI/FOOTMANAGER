<?php

namespace App\Domains\Booking\Services\Payments;

use App\Domains\Shared\Contracts\PaymentProvider;
use InvalidArgumentException;

class PaymentProviderManager
{
    /**
     * @var array<string, class-string<PaymentProvider>>
     */
    private array $providers = [
        'cash' => CashPaymentProvider::class,
    ];

    public function extend(string $name, string $class): void
    {
        $this->providers[$name] = $class;
    }

    public function driver(?string $name = null): PaymentProvider
    {
        $name = $name ?: 'cash';

        if (! isset($this->providers[$name])) {
            throw new InvalidArgumentException("Unsupported payment provider [{$name}].");
        }

        return app($this->providers[$name]);
    }
}
