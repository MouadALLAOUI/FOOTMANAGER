<?php

namespace App\Domains\Chat\Events;

use App\Domains\Chat\Models\MatchChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public MatchChatMessage $message) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('match-chat.'.$this->message->match_id);
    }

    public function broadcastAs(): string
    {
        return 'chat.message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'match_id' => $this->message->match_id,
            'user_id' => $this->message->user_id,
            'type' => $this->message->type,
            'message' => $this->message->message,
            'is_system' => $this->message->is_system,
            'created_at' => $this->message->created_at?->toIso8601String(),
        ];
    }
}
