<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResourcesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locale = $request->user()?->playerProfile?->language ?? 'ar';

        $resources = [
            'nutrition' => [
                'title' => $locale === 'ar' ? 'التغذية للاعبين' : 'Nutrition for Players',
                'items' => $locale === 'ar'
                    ? ['اشرب الماء قبل المباراة', 'تناول وجبة خفيفة قبل المباراة بساعتين', 'تجنب المشروبات الغازية']
                    : ['Hydrate before the match', 'Eat a light meal 2 hours before', 'Avoid sugary drinks'],
            ],
            'training' => [
                'title' => $locale === 'ar' ? 'نصائح تدريبية' : 'Training Tips',
                'items' => $locale === 'ar'
                    ? ['الإحماء قبل كل تمرين', 'تدريب التمرير والاستلام يومياً', 'الراحة الكافية بعد المباريات']
                    : ['Warm up before every session', 'Practice passing and control daily', 'Rest well after matches'],
            ],
            'injury_prevention' => [
                'title' => $locale === 'ar' ? 'الوقاية من الإصابات' : 'Injury Prevention',
                'items' => $locale === 'ar'
                    ? ['تمدد قبل وبعد المباراة', 'استخدم الأحذية المناسبة', 'لا تهمل فترات الاستشفاء']
                    : ['Stretch before and after', 'Use proper footwear', 'Never skip recovery time'],
            ],
        ];

        return response()->json([
            'data' => $resources,
        ]);
    }
}
