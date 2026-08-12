<?php

namespace App\Domains\Chat\Services;

use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Chat\Models\MatchChatMute;
use App\Domains\Chat\Models\MatchChatRead;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

class MatchChatService
{
    public function send(User $user, FootballMatch $match, string $message, string $type = MatchChatMessage::TYPE_TEXT): MatchChatMessage
    {
        $this->assertCanSend($user, $match);

        $msg = MatchChatMessage::query()->create([
            'match_id' => $match->id,
            'user_id' => $user->id,
            'type' => $type,
            'message' => $message,
        ]);

        return $msg->load('user:id,name,role');
    }

    public function sendSystem(FootballMatch $match, string $message): MatchChatMessage
    {
        return MatchChatMessage::query()->create([
            'match_id' => $match->id,
            'user_id' => null,
            'type' => MatchChatMessage::TYPE_SYSTEM,
            'message' => $message,
            'is_system' => true,
        ]);
    }

    public function sendAnnouncement(User $user, FootballMatch $match, string $message): MatchChatMessage
    {
        if (! $this->isMatchManager($user, $match)) {
            throw new DomainException('فقط مدير الفريق يمكنه نشر إعلان.', 403);
        }

        $this->assertCanSend($user, $match);

        return $this->send($user, $match, $message, MatchChatMessage::TYPE_ANNOUNCEMENT);
    }

    public function edit(User $user, MatchChatMessage $message, string $newText): MatchChatMessage
    {
        if ((int) $message->user_id !== (int) $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك تعديل هذه الرسالة.', 403);
        }

        $message->update([
            'message' => $newText,
            'is_edited' => true,
        ]);

        return $message->load('user:id,name,role');
    }

    public function delete(User $user, MatchChatMessage $message): void
    {
        if ((int) $message->user_id !== (int) $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك حذف هذه الرسالة.', 403);
        }

        $message->delete();
    }

    public function pin(User $user, FootballMatch $match, MatchChatMessage $message): MatchChatMessage
    {
        if (! $this->isMatchManager($user, $match) && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك تثبيت هذه الرسالة.', 403);
        }

        $message->update(['is_pinned' => ! $message->is_pinned]);

        return $message;
    }

    public function messages(FootballMatch $match, ?int $afterId = null, int $perPage = 50): LengthAwarePaginator
    {
        $query = MatchChatMessage::query()
            ->where('match_id', $match->id)
            ->where('status', MatchChatMessage::STATUS_ACTIVE)
            ->with('user:id,name,role');

        if ($afterId !== null) {
            $query->where('id', '>', $afterId);
        }

        return $query
            ->orderBy('is_pinned', 'desc')
            ->orderBy('id')
            ->paginate($perPage);
    }

    public function markRead(User $user, FootballMatch $match, int $lastReadMessageId): array
    {
        MatchChatRead::query()->updateOrCreate(
            ['match_id' => $match->id, 'user_id' => $user->id],
            ['last_read_message_id' => $lastReadMessageId],
        );

        return $this->readStatus($user, $match);
    }

    public function readStatus(User $user, FootballMatch $match): array
    {
        $read = MatchChatRead::query()
            ->where('match_id', $match->id)
            ->where('user_id', $user->id)
            ->value('last_read_message_id');

        $lastId = MatchChatMessage::query()
            ->where('match_id', $match->id)
            ->where('status', MatchChatMessage::STATUS_ACTIVE)
            ->max('id');

        $unread = $read
            ? MatchChatMessage::query()
                ->where('match_id', $match->id)
                ->where('status', MatchChatMessage::STATUS_ACTIVE)
                ->where('id', '>', $read)
                ->count()
            : (int) MatchChatMessage::query()
                ->where('match_id', $match->id)
                ->where('status', MatchChatMessage::STATUS_ACTIVE)
                ->count();

        return [
            'last_read_message_id' => (int) $read,
            'last_message_id' => (int) $lastId,
            'unread_count' => $unread,
        ];
    }

    public function mute(User $user, FootballMatch $match, int $minutes = 60): array
    {
        MatchChatMute::query()->updateOrCreate(
            ['match_id' => $match->id, 'user_id' => $user->id],
            ['muted_until' => now()->addMinutes(max(1, $minutes))],
        );

        return ['muted' => true, 'muted_until' => now()->addMinutes(max(1, $minutes))->toIso8601String()];
    }

    public function unmute(User $user, FootballMatch $match): array
    {
        MatchChatMute::query()
            ->where('match_id', $match->id)
            ->where('user_id', $user->id)
            ->delete();

        return ['muted' => false];
    }

    protected function assertCanSend(User $user, FootballMatch $match): void
    {
        if (! app(MatchMembershipService::class)->userParticipates($user, $match)) {
            throw new DomainException('أنت لست مشتركاً في هذه المباراة.', 403);
        }

        $muted = MatchChatMute::query()
            ->where('match_id', $match->id)
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->whereNull('muted_until')->orWhere('muted_until', '>', now());
            })
            ->exists();

        if ($muted) {
            throw new DomainException('تم كتمك في هذه الغرفة.', 403);
        }
    }

    protected function isMatchManager(User $user, FootballMatch $match): bool
    {
        $teamIds = array_filter([$match->home_team_id, $match->away_team_id]);

        if (empty($teamIds)) {
            return false;
        }

        return Team::query()
            ->whereIn('id', $teamIds)
            ->where('manager_id', $user->id)
            ->exists();
    }
}
