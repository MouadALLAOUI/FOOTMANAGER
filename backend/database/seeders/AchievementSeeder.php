<?php

namespace Database\Seeders;

use App\Domains\Player\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $achievements = [
            [
                'key' => 'first_match',
                'title_ar' => 'أول مباراة',
                'title_en' => 'First Match',
                'description_ar' => 'خاض أول مباراة في المسار',
                'description_en' => 'Played your first match',
                'icon' => 'flag',
                'category' => 'milestones',
                'points' => 5,
            ],
            [
                'key' => 'first_goal',
                'title_ar' => 'أول هدف',
                'title_en' => 'First Goal',
                'description_ar' => 'سجل أول هدف',
                'description_en' => 'Scored your first goal',
                'icon' => 'futbol',
                'category' => 'milestones',
                'points' => 10,
            ],
            [
                'key' => 'top_scorer',
                'title_ar' => 'الهداف',
                'title_en' => 'Top Scorer',
                'description_ar' => 'وصل إلى عدد كبير من الأهداف',
                'description_en' => 'Reached a high number of career goals',
                'icon' => 'crown',
                'category' => 'performance',
                'points' => 25,
            ],
            [
                'key' => 'best_playmaker',
                'title_ar' => 'صانع الألعاب',
                'title_en' => 'Best Playmaker',
                'description_ar' => 'قدّم عدداً كبيراً من التمريرات الحاسمة',
                'description_en' => 'Provided many assists',
                'icon' => 'wand-magic',
                'category' => 'performance',
                'points' => 25,
            ],
            [
                'key' => 'most_valuable_player',
                'title_ar' => 'أفضل لاعب',
                'title_en' => 'Most Valuable Player',
                'description_ar' => 'نال جائزة أفضل لاعب في عدة مباريات',
                'description_en' => 'Won MVP award multiple times',
                'icon' => 'star',
                'category' => 'performance',
                'points' => 25,
            ],
            [
                'key' => 'iron_man',
                'title_ar' => 'الحديد',
                'title_en' => 'Iron Man',
                'description_ar' => 'خاض عدداً كبيراً من المباريات دون توقف',
                'description_en' => 'Played many matches without stopping',
                'icon' => 'shield',
                'category' => 'durability',
                'points' => 30,
            ],
            [
                'key' => 'hat_trick_hero',
                'title_ar' => 'بطل الهاتريك',
                'title_en' => 'Hat-Trick Hero',
                'description_ar' => 'سجل ثلاثة أهداف في مباراة واحدة',
                'description_en' => 'Scored three goals in a single match',
                'icon' => 'hat-cowboy',
                'category' => 'performance',
                'points' => 20,
            ],
            [
                'key' => 'winning_streak',
                'title_ar' => 'سلسلة الانتصارات',
                'title_en' => 'Winning Streak',
                'description_ar' => 'حقق سلسلة انتصارات متتالية',
                'description_en' => 'Achieved a winning streak',
                'icon' => 'fire',
                'category' => 'durability',
                'points' => 20,
            ],
            [
                'key' => 'tournament_champion',
                'title_ar' => 'بطل البطولة',
                'title_en' => 'Tournament Champion',
                'description_ar' => 'فاز في عدة مباريات بطولة',
                'description_en' => 'Won several tournament matches',
                'icon' => 'trophy',
                'category' => 'achievements',
                'points' => 40,
            ],
            [
                'key' => 'clean_sheet_master',
                'title_ar' => 'سيد النظافة',
                'title_en' => 'Clean Sheet Master',
                'description_ar' => 'حافظ على نظافة شباكه في مباريات كثيرة',
                'description_en' => 'Kept many clean sheets',
                'icon' => 'door-closed',
                'category' => 'performance',
                'points' => 20,
            ],
        ];

        foreach ($achievements as $achievement) {
            Achievement::updateOrCreate(['key' => $achievement['key']], $achievement);
        }
    }
}
