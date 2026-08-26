<?php

namespace App\Notifications\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Dispatchable, Queueable;

    /**
     * The number of minutes the token is valid for.
     */
    public int $expireMinutes;

    public function __construct(
        public readonly string $token,
    ) {
        $this->expireMinutes = (int) Config::get('auth.passwords.users.expire', 60);
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);

        return (new MailMessage)
            ->subject('إعادة تعيين كلمة المرور — FootMANAGER')
            ->greeting('مرحباً '.$notifiable->name.'،')
            ->line('تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.')
            ->line('اضغط على الزر أدناه لاختيار كلمة مرور جديدة:')
            ->action('إعادة تعيين كلمة المرور', $url)
            ->line("ينتهي صلاحية هذا الرابط خلال {$this->expireMinutes} دقيقة.")
            ->line('إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة ولن يتغير أي شيء.');
    }

    private function resetUrl(object $notifiable): string
    {
        $email = urlencode((string) $notifiable->getEmailForPasswordReset());
        $frontend = rtrim((string) Config::get('app.frontend_url'), '/');

        return "{$frontend}/reset-password?token={$this->token}&email={$email}";
    }
}
