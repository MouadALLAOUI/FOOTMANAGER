<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\AnnouncementPublished;
use App\Domains\Team\Models\AnnouncementRead;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamAnnouncement;
use App\Models\User;

class TeamAnnouncementService
{
    public function index(Team $team, User $viewer): array
    {
        $isManager = (int) $team->manager_id === (int) $viewer->id;

        $query = $team->announcements()
            ->withCount(['reads'])
            ->with('creator:id,name');

        if (! $isManager) {
            $query->whereNotNull('published_at');
        }

        $announcements = $query->get();

        $viewerPlayerId = $viewer->rosterPlayer?->id;

        $readAnnouncementIds = $viewerPlayerId
            ? AnnouncementRead::where('player_id', $viewerPlayerId)
                ->whereIn('announcement_id', $announcements->pluck('id'))
                ->pluck('announcement_id')
                ->all()
            : [];

        $rosterPlayerIds = $team->players()->pluck('id')->all();

        foreach ($announcements as $announcement) {
            $announcement->setAttribute('read_by_viewer', in_array($announcement->id, $readAnnouncementIds, true));

            if ($isManager && $announcement->visibility === 'all' && $rosterPlayerIds) {
                $announcement->setAttribute('unread_count', max(0, count($rosterPlayerIds) - $announcement->reads_count));
            } else {
                $announcement->setAttribute('unread_count', 0);
            }
        }

        return [
            'announcements' => $announcements,
            'total_unread' => $viewerPlayerId
                ? AnnouncementRead::where('player_id', $viewerPlayerId)->whereNull('read_at')->count()
                : 0,
        ];
    }

    public function store(Team $team, User $creator, array $data): TeamAnnouncement
    {
        $scheduledAt = $data['scheduled_at'] ?? null;

        $publishImmediately = empty($scheduledAt) || now()->gte($scheduledAt);

        $announcement = $team->announcements()->create([
            'title' => $data['title'],
            'message' => $data['message'],
            'priority' => $data['priority'] ?? TeamAnnouncement::PRIORITY_NORMAL,
            'visibility' => $data['visibility'] ?? 'all',
            'target_player_ids' => ($data['visibility'] ?? 'all') === 'specific' ? ($data['target_player_ids'] ?? []) : null,
            'created_by' => $creator->id,
            'scheduled_at' => $scheduledAt ?: null,
            'published_at' => $publishImmediately ? now() : null,
            'is_pinned' => $data['is_pinned'] ?? false,
        ]);

        TeamCache::flushTeam($team->id);

        if ($publishImmediately) {
            $this->afterPublished($announcement);
        }

        return $announcement->load('creator:id,name');
    }

    public function update(Team $team, TeamAnnouncement $announcement, array $data): TeamAnnouncement
    {
        $values = [
            'title' => $data['title'] ?? $announcement->title,
            'message' => $data['message'] ?? $announcement->message,
            'priority' => $data['priority'] ?? $announcement->priority,
            'visibility' => $data['visibility'] ?? $announcement->visibility,
            'is_pinned' => $data['is_pinned'] ?? $announcement->is_pinned,
        ];

        if (array_key_exists('visibility', $data) && $data['visibility'] === 'specific') {
            $values['target_player_ids'] = $data['target_player_ids'] ?? $announcement->target_player_ids;
        } elseif (array_key_exists('visibility', $data) && $data['visibility'] === 'all') {
            $values['target_player_ids'] = null;
        }

        if (array_key_exists('scheduled_at', $data)) {
            $values['scheduled_at'] = $data['scheduled_at'] ?: null;
        }

        $notPublishedYet = $announcement->published_at === null;

        if ($notPublishedYet && array_key_exists('scheduled_at', $data)) {
            $values['published_at'] = now()->gte($data['scheduled_at'] ?? now()) ? now() : null;
        }

        $announcement->update($values);
        TeamCache::flushTeam($team->id);

        if ($announcement->isPublished() && $announcement->wasChanged('published_at')) {
            $this->afterPublished($announcement);
        }

        return $announcement->fresh()->load('creator:id,name');
    }

    public function destroy(Team $team, TeamAnnouncement $announcement): void
    {
        $announcement->delete();
        TeamCache::flushTeam($team->id);
    }

    public function markRead(TeamAnnouncement $announcement, Player $player): TeamAnnouncement
    {
        AnnouncementRead::updateOrCreate(
            ['announcement_id' => $announcement->id, 'player_id' => $player->id],
            ['read_at' => now()]
        );

        return $announcement->fresh();
    }

    /**
     * Publishes announcements whose scheduled time has arrived.
     */
    public function publishDue(): int
    {
        $due = TeamAnnouncement::query()
            ->whereNull('published_at')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        foreach ($due as $announcement) {
            $announcement->update(['published_at' => now()]);
            $this->afterPublished($announcement);
        }

        return $due->count();
    }

    private function afterPublished(TeamAnnouncement $announcement): void
    {
        event(new AnnouncementPublished($announcement));
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:'.(int) config('team.announcements.max_length'),
            'priority' => 'sometimes|in:normal,important,urgent',
            'visibility' => 'sometimes|in:all,specific',
            'target_player_ids' => 'sometimes|nullable|array',
            'target_player_ids.*' => 'integer',
            'scheduled_at' => 'sometimes|nullable|date',
            'is_pinned' => 'sometimes|boolean',
        ];
    }

    public function updateRules(): array
    {
        $rules = $this->rules();

        $rules['title'] = 'sometimes|string|max:255';
        $rules['message'] = 'sometimes|string|max:'.(int) config('team.announcements.max_length');

        return $rules;
    }
}
