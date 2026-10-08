<?php

namespace App\Console\Commands;

use App\Domains\Match\Models\MatchDelegatedSubmission;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Console\Command;

class DelegatedFoulReportCommand extends Command
{
    protected $signature = 'delegated:foul-report';

    protected $description = 'Read-only report of all matches recorded via delegated secret links, their teams, and foul counts.';

    public function handle(): int
    {
        $submissions = MatchDelegatedSubmission::with([
            'fixture.competition',
            'fixture.homeTeam',
            'fixture.awayTeam',
            'fixture.match',
        ])->get();

        $this->info('=== DELEGATED MATCH FOUL AUDIT REPORT (READ-ONLY) ===');
        $this->info('Found ' . $submissions->count() . ' delegated submissions.');

        if ($submissions->isEmpty()) {
            $this->comment('No delegated match submissions found.');
            return self::SUCCESS;
        }

        $rows = [];

        foreach ($submissions as $sub) {
            $fixture = $sub->fixture;
            $competition = $fixture?->competition;
            $tournamentName = $competition?->name ?? 'N/A';

            $threshold = 6;
            $scope = 'half';
            if ($competition instanceof Tournament) {
                $threshold = $competition->teamFoulThreshold() ?: 6;
                $scope = $competition->foulResetScope() ?: 'half';
            }

            $homeId = (int) ($fixture?->home_team_id ?? 0);
            $awayId = (int) ($fixture?->away_team_id ?? 0);
            $homeName = $fixture?->homeTeam?->name ?? 'Home';
            $awayName = $fixture?->awayTeam?->name ?? 'Away';

            $events = is_array($sub->events) ? $sub->events : (json_decode($sub->events ?? '[]', true) ?: []);

            $homeFoulsH1 = 0;
            $homeFoulsH2 = 0;
            $awayFoulsH1 = 0;
            $awayFoulsH2 = 0;

            foreach ($events as $e) {
                if (($e['type'] ?? '') !== 'foul') {
                    continue;
                }
                $tid = (int) ($e['team_id'] ?? 0);
                $half = (string) ($e['half'] ?? 'first');

                if ($tid === $homeId) {
                    if ($half === 'second') {
                        $homeFoulsH2++;
                    } else {
                        $homeFoulsH1++;
                    }
                } elseif ($tid === $awayId) {
                    if ($half === 'second') {
                        $awayFoulsH2++;
                    } else {
                        $awayFoulsH1++;
                    }
                }
            }

            $homeTotal = $homeFoulsH1 + $homeFoulsH2;
            $awayTotal = $awayFoulsH1 + $awayFoulsH2;

            $homePenalty = ($scope === 'half')
                ? ($homeFoulsH1 >= $threshold || $homeFoulsH2 >= $threshold)
                : ($homeTotal >= $threshold);

            $awayPenalty = ($scope === 'half')
                ? ($awayFoulsH1 >= $threshold || $awayFoulsH2 >= $threshold)
                : ($awayTotal >= $threshold);

            $rows[] = [
                'ID' => $sub->id,
                'Fixture' => $sub->fixture_id,
                'Status' => $sub->status,
                'Tournament' => $tournamentName,
                'Threshold' => $threshold . ' (' . $scope . ')',
                'Home Team' => "{$homeName} [H1:{$homeFoulsH1}, H2:{$homeFoulsH2}, Tot:{$homeTotal}]" . ($homePenalty ? ' ⚠️PENALTY' : ''),
                'Away Team' => "{$awayName} [H1:{$awayFoulsH1}, H2:{$awayFoulsH2}, Tot:{$awayTotal}]" . ($awayPenalty ? ' ⚠️PENALTY' : ''),
                'Recorded At' => $sub->created_at?->toDateTimeString() ?? 'N/A',
            ];
        }

        $this->table(
            ['Sub ID', 'Fixture ID', 'Status', 'Tournament', 'Threshold (Scope)', 'Home Team Fouls', 'Away Team Fouls', 'Recorded At'],
            $rows
        );

        $this->info('Report complete. 0 database records were modified.');

        return self::SUCCESS;
    }
}
