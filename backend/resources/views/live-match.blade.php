<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $match['home_team']['name'] }} ضد {{ $match['away_team']['name'] }} — البث المباشر | أجي تقصرو</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Cairo', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            50: '#ECFDF5',
                            100: '#D1FAE5',
                            200: '#A7F3D0',
                            500: '#10B981',
                            600: '#00875A',
                            700: '#047857',
                            800: '#065F46',
                            900: '#064E3B',
                            950: '#022C22',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body {
            font-family: 'Cairo', sans-serif;
            background-color: #F8FAFC;
            -webkit-tap-highlight-color: transparent;
        }
        .scoreboard-bg {
            background: linear-gradient(145deg, #064E3B 0%, #04382A 60%, #022C22 100%);
            box-shadow: 0 10px 25px -5px rgba(0, 135, 90, 0.25);
        }
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }
        .live-pulse {
            animation: pulse-dot 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .event-enter {
            animation: fadeIn 0.4s ease-out forwards;
        }
    </style>
</head>
<body class="text-slate-800 antialiased min-h-screen pb-14 selection:bg-emerald-500 selection:text-white">

    <div class="max-w-xl mx-auto px-4 pt-3 sm:pt-6">
        
        <!-- Header & Branding -->
        <header class="flex items-center justify-between py-2 mb-2">
            <a href="/" class="p-2 -ms-2 rounded-full hover:bg-slate-200/60 transition-colors text-slate-700" title="الرئيسية">
                <svg class="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                </svg>
            </a>

            <!-- Logo -->
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                        <path d="M2 12h20"/>
                    </svg>
                </div>
                <div class="flex flex-col text-center">
                    <span class="text-base font-black text-slate-900 leading-none">أجي تقصرو</span>
                    <span class="text-[10px] font-bold text-brand-600 tracking-wider">Aji Nqssro</span>
                </div>
            </div>

            <!-- Share Top Button -->
            <button type="button" onclick="copyLiveLink()" class="p-2 -me-2 rounded-full hover:bg-slate-200/60 transition-colors text-slate-700" title="نسخ رابط المباراة">
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
            </button>
        </header>

        <!-- Scoreboard Card (Approved Mockup Reference) -->
        <div class="scoreboard-bg rounded-3xl p-5 text-white relative overflow-hidden">
            <!-- Decorative landscape glow -->
            <div class="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -left-16 -bottom-16 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Top Row: Group Badge & Unofficial Notice -->
            <div class="flex items-center justify-between gap-2 mb-3">
                <div id="unofficialBadge" class="{{ $match['is_official'] ? 'hidden' : '' }}">
                    <span class="inline-flex items-center gap-1 bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                        <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                        <span>النتيجة غير رسمية</span>
                    </span>
                </div>

                <div class="ms-auto">
                    <span id="groupBadge" class="bg-white/20 border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-xl backdrop-blur-xs">
                        {{ $match['tournament']['group'] ?? $match['tournament']['round'] ?? 'المجموعة 1' }}
                    </span>
                </div>
            </div>

            <!-- Teams & Big Score Row -->
            <div class="grid grid-cols-3 items-center py-2">
                <!-- Home Team -->
                <div class="flex flex-col items-center text-center">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center overflow-hidden mb-2">
                        @if(!empty($match['home_team']['logo_url']))
                            <img src="{{ $match['home_team']['logo_url'] }}" alt="{{ $match['home_team']['name'] }}" class="w-full h-full object-contain rounded-full">
                        @else
                            <div class="w-full h-full rounded-full bg-brand-600 flex items-center justify-center text-white">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/>
                                </svg>
                            </div>
                        @endif
                    </div>
                    <h3 id="homeTeamName" class="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1">
                        {{ $match['home_team']['name'] }}
                    </h3>
                </div>

                <!-- Center Score & Status -->
                <div class="flex flex-col items-center justify-center text-center px-1">
                    <div id="scoreBox" class="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums my-1">
                        <span id="homeScoreText">{{ $match['home_score'] }}</span>
                        <span class="opacity-60 mx-1">-</span>
                        <span id="awayScoreText">{{ $match['away_score'] }}</span>
                    </div>

                    <!-- Status Pill -->
                    <div id="statusPill" class="mt-1">
                        @if($match['is_live'])
                            <span class="inline-flex items-center gap-1.5 bg-rose-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs">
                                <span class="w-2 h-2 rounded-full bg-white live-pulse"></span>
                                <span id="statusLabelText">مباشر</span>
                                @if($match['current_minute'] > 0)
                                    <span id="minuteText" class="font-bold tabular-nums">({{ $match['current_minute'] }}')</span>
                                @endif
                            </span>
                        @elseif($match['is_finished'])
                            <span class="bg-emerald-950/60 border border-emerald-400/30 text-emerald-200 font-extrabold text-xs px-3 py-1 rounded-full">
                                <span id="statusLabelText">انتهت</span>
                            </span>
                        @else
                            <span class="bg-white/15 text-white/90 font-extrabold text-xs px-3 py-1 rounded-full">
                                <span id="statusLabelText">{{ $match['status_text'] }}</span>
                            </span>
                        @endif
                    </div>
                </div>

                <!-- Away Team -->
                <div class="flex flex-col items-center text-center">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center overflow-hidden mb-2">
                        @if(!empty($match['away_team']['logo_url']))
                            <img src="{{ $match['away_team']['logo_url'] }}" alt="{{ $match['away_team']['name'] }}" class="w-full h-full object-contain rounded-full">
                        @else
                            <div class="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-white">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/>
                                </svg>
                            </div>
                        @endif
                    </div>
                    <h3 id="awayTeamName" class="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1">
                        {{ $match['away_team']['name'] }}
                    </h3>
                </div>
            </div>
        </div>

        <!-- 3-Column Context Cards -->
        <div class="grid grid-cols-3 gap-2 my-3">
            <!-- Venue -->
            <div class="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <div class="w-8 h-8 rounded-full bg-emerald-50 text-brand-600 flex items-center justify-center mb-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                    </svg>
                </div>
                <span id="stadiumNameText" class="text-xs font-black text-slate-800 line-clamp-1 leading-tight">{{ $match['stadium']['name'] }}</span>
                <span id="stadiumCityText" class="text-[10px] font-bold text-slate-400 mt-0.5">{{ $match['stadium']['city'] }}</span>
            </div>

            <!-- Date & Time -->
            <div class="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <div class="w-8 h-8 rounded-full bg-emerald-50 text-brand-600 flex items-center justify-center mb-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                    </svg>
                </div>
                <span class="text-xs font-black text-slate-800 line-clamp-1 leading-tight">
                    @if($match['scheduled_at'])
                        {{ \Carbon\Carbon::parse($match['scheduled_at'])->locale('ar')->translatedFormat('d M Y') }}
                    @else
                        اليوم
                    @endif
                </span>
                <span class="text-[10px] font-bold text-slate-400 mt-0.5">
                    @if($match['scheduled_at'])
                        {{ \Carbon\Carbon::parse($match['scheduled_at'])->format('H:i') }}
                    @else
                        --:--
                    @endif
                </span>
            </div>

            <!-- Tournament & Round -->
            <div class="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
                <div class="w-8 h-8 rounded-full bg-emerald-50 text-brand-600 flex items-center justify-center mb-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.004 0H9.496m5.004 0A5.25 5.25 0 0018 9.75v-1.5a.75.75 0 00-.75-.75h-1.5A.75.75 0 0015 8.25v1.5a3 3 0 01-3 3 3 3 0 01-3-3v-1.5A.75.75 0 008.25 7.5h-1.5a.75.75 0 00-.75.75v1.5a5.25 5.25 0 003.504 4.5"/>
                    </svg>
                </div>
                <span id="tournamentNameText" class="text-xs font-black text-slate-800 line-clamp-1 leading-tight">{{ $match['tournament']['name'] }}</span>
                <span id="tournamentRoundText" class="text-[10px] font-bold text-slate-400 mt-0.5">{{ $match['tournament']['round'] }}</span>
            </div>
        </div>

        <!-- Foul Counters Panel (Follows exact 5 fouls threshold rules) -->
        <div id="foulSection" class="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs mb-3 {{ $match['fouls']['enabled'] ? '' : 'hidden' }}">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                <div class="flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                    </svg>
                    <span class="text-xs font-black text-slate-800">عداد الأخطاء التراكمية (Fouls)</span>
                </div>
                <span class="text-[10px] font-bold text-slate-400">الحد الأقصى: <span id="foulThresholdNum">{{ $match['fouls']['threshold'] ?? 5 }}</span> أخطاء</span>
            </div>

            <div class="grid grid-cols-2 gap-2.5 text-center">
                <!-- Home Fouls -->
                <div id="homeFoulCard" class="p-2.5 rounded-xl border transition-colors {{ $match['fouls']['home_penalty'] ? 'bg-rose-50 border-rose-300' : ($match['fouls']['home_warning'] ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-100') }}">
                    <span class="text-[11px] font-extrabold text-slate-700 block truncate">{{ $match['home_team']['name'] }}</span>
                    <div class="flex items-center justify-center gap-1 mt-1">
                        <span id="homeFoulCount" class="text-xl font-black tabular-nums {{ $match['fouls']['home_penalty'] ? 'text-rose-600' : ($match['fouls']['home_warning'] ? 'text-amber-600' : 'text-slate-800') }}">
                            {{ $match['fouls']['home_count'] }}
                        </span>
                        <span class="text-xs text-slate-400 font-bold">أخطاء</span>
                    </div>
                    <div id="homeFoulNotice" class="mt-1 text-[10px] font-extrabold">
                        @if($match['fouls']['home_penalty'])
                            <span class="text-rose-600">⚠️ ركلة جزاء (تجاوز 5 أخطاء)</span>
                        @elseif($match['fouls']['home_warning'])
                            <span class="text-amber-600">وصل للحد الأقصى (5 أخطاء)</span>
                        @endif
                    </div>
                </div>

                <!-- Away Fouls -->
                <div id="awayFoulCard" class="p-2.5 rounded-xl border transition-colors {{ $match['fouls']['away_penalty'] ? 'bg-rose-50 border-rose-300' : ($match['fouls']['away_warning'] ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-100') }}">
                    <span class="text-[11px] font-extrabold text-slate-700 block truncate">{{ $match['away_team']['name'] }}</span>
                    <div class="flex items-center justify-center gap-1 mt-1">
                        <span id="awayFoulCount" class="text-xl font-black tabular-nums {{ $match['fouls']['away_penalty'] ? 'text-rose-600' : ($match['fouls']['away_warning'] ? 'text-amber-600' : 'text-slate-800') }}">
                            {{ $match['fouls']['away_count'] }}
                        </span>
                        <span class="text-xs text-slate-400 font-bold">أخطاء</span>
                    </div>
                    <div id="awayFoulNotice" class="mt-1 text-[10px] font-extrabold">
                        @if($match['fouls']['away_penalty'])
                            <span class="text-rose-600">⚠️ ركلة جزاء (تجاوز 5 أخطاء)</span>
                        @elseif($match['fouls']['away_warning'])
                            <span class="text-amber-600">وصل للحد الأقصى (5 أخطاء)</span>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Match Events Card -->
        <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs mb-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-emerald-50 text-brand-600 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h2 class="text-sm font-black text-slate-800">أحداث المباراة</h2>
                </div>

                <div class="flex items-center gap-1.5">
                    <span id="liveIndicator" class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 {{ $match['is_live'] ? 'live-pulse bg-rose-500' : '' }}"></span>
                        <span id="pollStatusLabel">{{ $match['is_live'] ? 'مباشر (تحديث تلقائي)' : ($match['is_finished'] ? 'ملخص نهائي' : 'في الانتظار') }}</span>
                    </span>
                </div>
            </div>

            <!-- Events List (Newest First) -->
            <div id="eventsList" class="space-y-2.5">
                @forelse($events as $event)
                    <div id="event-row-{{ $event['id'] }}" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 transition-all">
                        <!-- Minute -->
                        <span class="text-xs font-black text-slate-400 tabular-nums shrink-0 min-w-8 text-center">
                            {{ $event['minute'] }}'
                        </span>

                        <!-- Event Icon -->
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-white shadow-2xs border border-slate-100">
                            @if(in_array($event['type'], ['goal', 'penalty_goal']))
                                <span>⚽</span>
                            @elseif($event['type'] === 'yellow_card' || ($event['type'] === 'foul' && ($event['punishment'] ?? '') === 'yellow'))
                                <span class="w-3.5 h-4.5 bg-amber-400 rounded-xs inline-block"></span>
                            @elseif($event['type'] === 'red_card' || ($event['type'] === 'foul' && ($event['punishment'] ?? '') === 'red'))
                                <span class="w-3.5 h-4.5 bg-rose-500 rounded-xs inline-block"></span>
                            @elseif($event['type'] === 'second_yellow' || ($event['type'] === 'foul' && ($event['punishment'] ?? '') === 'second_yellow'))
                                <span class="text-[10px]">🟨🟥</span>
                            @elseif($event['type'] === 'substitution')
                                <span>🔄</span>
                            @elseif($event['type'] === 'foul')
                                <span>🛑</span>
                            @else
                                <span>📌</span>
                            @endif
                        </div>

                        <!-- Player & Details -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-extrabold text-slate-900 truncate">
                                    {{ $event['player_name'] ?: 'حدث' }}
                                </span>
                                @if(!empty($event['type']) && in_array($event['type'], ['goal', 'penalty_goal']))
                                    <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">هدف</span>
                                @endif
                            </div>
                            <div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                                <span class="truncate text-brand-700">{{ $event['team_name'] }}</span>
                                @if(!empty($event['assist_player_name']))
                                    <span>• تمريرة: {{ $event['assist_player_name'] }}</span>
                                @endif
                            </div>
                        </div>
                    </div>
                @empty
                    <div id="noEventsNotice" class="text-center py-8 px-4 text-slate-400">
                        <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <p class="text-xs font-bold">لا توجد أحداث مسجلة بعد</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">سيتم تحديث الأحداث والأهداف فور تسجيلها مباشرة</p>
                    </div>
                @endforelse

                <!-- Final Whistle Badge if Finished -->
                @if($match['is_finished'])
                    <div id="finalWhistleRow" class="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                        <span class="text-xs font-black text-emerald-700 shrink-0 min-w-8 text-center">90'</span>
                        <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm shrink-0">
                            ⏱️
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="text-xs font-black text-brand-900 block">نهاية المباراة</span>
                            <span class="text-[10px] font-bold text-brand-700">النتيجة النهائية: {{ $match['home_score'] }} - {{ $match['away_score'] }}</span>
                        </div>
                    </div>
                @endif
            </div>

            <!-- Match Referee & Status Meta Card -->
            <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                <div class="flex items-center gap-1.5 text-slate-500">
                    <svg class="w-4 h-4 text-brand-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                    </svg>
                    <span class="font-bold">الحكم:</span>
                    <span id="refereeNameText" class="font-extrabold text-slate-800 truncate">{{ $match['referee_name'] }}</span>
                </div>

                <div class="flex items-center justify-end gap-1.5 text-slate-500">
                    <span class="w-2 h-2 rounded-full {{ $match['is_live'] ? 'bg-rose-500 live-pulse' : 'bg-brand-600' }}"></span>
                    <span class="font-bold">الحالة:</span>
                    <span id="metaStatusText" class="font-extrabold text-slate-800">{{ $match['status_text'] }}</span>
                </div>
            </div>
        </div>

        <!-- Sharing & Actions -->
        <div class="space-y-2 mt-4">
            <!-- WhatsApp Share Button -->
            <a id="whatsappShareBtn" href="{{ $match['share']['whatsapp_url'] }}" target="_blank" rel="noopener noreferrer" class="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm py-3 px-4 rounded-2xl shadow-sm active:scale-[0.99] transition-all">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>مشاركة المباراة عبر WhatsApp</span>
            </a>

            <!-- Copy Link Button -->
            <button id="copyLinkBtn" type="button" onclick="copyLiveLink()" class="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-sm py-2.5 px-4 rounded-2xl border border-slate-200/90 shadow-2xs active:scale-[0.99] transition-all">
                <svg id="copyIcon" class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/>
                </svg>
                <span id="copyLinkText">نسخ رابط المتابعة المباشرة</span>
            </button>
        </div>

        <!-- Toast Notification -->
        <div id="copyToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300 z-50 flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
            <span>تم نسخ الرابط بنجاح!</span>
        </div>

    </div>

    <!-- Client Script: AJAX Polling & Dynamic UI Updates -->
    <script>
        const PUBLIC_TOKEN = "{{ $public_token }}";
        const DATA_ENDPOINT = "/live/" + PUBLIC_TOKEN + "/data";
        let lastEventId = {{ (int) $last_event_id }};
        let lastServerTime = "{{ $server_time }}";
        let isMatchFinished = {{ $match['is_finished'] ? 'true' : 'false' }};
        let isOfficialResult = {{ $match['is_official'] ? 'true' : 'false' }};
        let pollTimer = null;
        let isPollingActive = true;

        // Copy Link Action
        function copyLiveLink() {
            const url = window.location.href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(showCopyToast).catch(() => fallbackCopy(url));
            } else {
                fallbackCopy(url);
            }
        }

        function fallbackCopy(text) {
            const temp = document.createElement('input');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showCopyToast();
        }

        function showCopyToast() {
            const toast = document.getElementById('copyToast');
            const textEl = document.getElementById('copyLinkText');
            if (textEl) textEl.innerText = "تم النسخ بنجاح!";
            toast.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                toast.classList.add('opacity-0', 'pointer-events-none');
                if (textEl) textEl.innerText = "نسخ رابط المتابعة المباشرة";
            }, 2500);
        }

        // Incremental Polling Function
        async function fetchMatchUpdate() {
            if (!isPollingActive) return;

            try {
                const params = new URLSearchParams({
                    since_id: lastEventId,
                    since_time: lastServerTime,
                });

                const res = await fetch(`${DATA_ENDPOINT}?${params.toString()}`, {
                    headers: { 'Accept': 'application/json' }
                });

                if (!res.ok) return;

                const data = await res.json();
                applyMatchUpdate(data);

            } catch (err) {
                // Gracefully ignore network errors and retry on next interval
                console.warn('Live poll network glitch, retrying...', err);
            }
        }

        function applyMatchUpdate(data) {
            if (!data || !data.match) return;

            const m = data.match;
            lastServerTime = data.server_time || lastServerTime;

            // Update scores
            document.getElementById('homeScoreText').innerText = m.home_score;
            document.getElementById('awayScoreText').innerText = m.away_score;

            // Update unofficial label
            const unoffEl = document.getElementById('unofficialBadge');
            if (unoffEl) {
                if (m.is_official) {
                    unoffEl.classList.add('hidden');
                } else {
                    unoffEl.classList.remove('hidden');
                }
            }

            // Update status pill & minute
            const statusPill = document.getElementById('statusPill');
            const statusLabelText = document.getElementById('statusLabelText');
            const minuteTextEl = document.getElementById('minuteText');
            const metaStatusText = document.getElementById('metaStatusText');

            if (statusLabelText) statusLabelText.innerText = m.is_live ? 'مباشر' : (m.is_finished ? 'انتهت' : m.status_text);
            if (metaStatusText) metaStatusText.innerText = m.status_text;

            if (m.is_live) {
                if (minuteTextEl && m.current_minute > 0) {
                    minuteTextEl.innerText = `(${m.current_minute}')`;
                    minuteTextEl.classList.remove('hidden');
                }
            } else {
                if (minuteTextEl) minuteTextEl.classList.add('hidden');
            }

            // Update fouls
            if (m.fouls && m.fouls.enabled) {
                const foulSection = document.getElementById('foulSection');
                if (foulSection) foulSection.classList.remove('hidden');

                const homeFoulCount = document.getElementById('homeFoulCount');
                const awayFoulCount = document.getElementById('awayFoulCount');
                if (homeFoulCount) homeFoulCount.innerText = m.fouls.home_count;
                if (awayFoulCount) awayFoulCount.innerText = m.fouls.away_count;

                const homeCard = document.getElementById('homeFoulCard');
                const awayCard = document.getElementById('awayFoulCard');
                const homeNotice = document.getElementById('homeFoulNotice');
                const awayNotice = document.getElementById('awayFoulNotice');

                if (homeCard && homeNotice) {
                    if (m.fouls.home_penalty) {
                        homeCard.className = 'p-2.5 rounded-xl border bg-rose-50 border-rose-300 transition-colors';
                        homeNotice.innerHTML = '<span class="text-rose-600">⚠️ ركلة جزاء (تجاوز 5 أخطاء)</span>';
                    } else if (m.fouls.home_warning) {
                        homeCard.className = 'p-2.5 rounded-xl border bg-amber-50 border-amber-300 transition-colors';
                        homeNotice.innerHTML = '<span class="text-amber-600">وصل للحد الأقصى (5 أخطاء)</span>';
                    } else {
                        homeCard.className = 'p-2.5 rounded-xl border bg-slate-50 border-slate-100 transition-colors';
                        homeNotice.innerHTML = '';
                    }
                }

                if (awayCard && awayNotice) {
                    if (m.fouls.away_penalty) {
                        awayCard.className = 'p-2.5 rounded-xl border bg-rose-50 border-rose-300 transition-colors';
                        awayNotice.innerHTML = '<span class="text-rose-600">⚠️ ركلة جزاء (تجاوز 5 أخطاء)</span>';
                    } else if (m.fouls.away_warning) {
                        awayCard.className = 'p-2.5 rounded-xl border bg-amber-50 border-amber-300 transition-colors';
                        awayNotice.innerHTML = '<span class="text-amber-600">وصل للحد الأقصى (5 أخطاء)</span>';
                    } else {
                        awayCard.className = 'p-2.5 rounded-xl border bg-slate-50 border-slate-100 transition-colors';
                        awayNotice.innerHTML = '';
                    }
                }
            }

            // Update events
            const eventsList = document.getElementById('eventsList');
            const noEventsNotice = document.getElementById('noEventsNotice');

            // Handle updated events (e.g. player name corrected by committee)
            if (Array.isArray(data.updated_events) && data.updated_events.length > 0) {
                data.updated_events.forEach(ev => {
                    const row = document.getElementById(`event-row-${ev.id}`);
                    if (row) {
                        row.replaceWith(renderEventNode(ev));
                    }
                });
            }

            // Handle newly added events
            if (Array.isArray(data.events) && data.events.length > 0) {
                if (noEventsNotice) noEventsNotice.remove();

                data.events.forEach(ev => {
                    const existingRow = document.getElementById(`event-row-${ev.id}`);
                    if (!existingRow) {
                        const newNode = renderEventNode(ev, true);
                        eventsList.prepend(newNode);
                    }
                });

                if (data.last_event_id && data.last_event_id > lastEventId) {
                    lastEventId = data.last_event_id;
                }
            }

            // Check if finished
            if (m.is_finished) {
                isMatchFinished = true;
                const pollLabel = document.getElementById('pollStatusLabel');
                if (pollLabel) pollLabel.innerText = "ملخص نهائي";

                // Ensure final whistle row exists
                if (!document.getElementById('finalWhistleRow')) {
                    const whistleNode = document.createElement('div');
                    whistleNode.id = 'finalWhistleRow';
                    whistleNode.className = 'flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80';
                    whistleNode.innerHTML = `
                        <span class="text-xs font-black text-emerald-700 shrink-0 min-w-8 text-center">90'</span>
                        <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm shrink-0">⏱️</div>
                        <div class="flex-1 min-w-0">
                            <span class="text-xs font-black text-brand-900 block">نهاية المباراة</span>
                            <span class="text-[10px] font-bold text-brand-700">النتيجة النهائية: ${m.home_score} - ${m.away_score}</span>
                        </div>
                    `;
                    eventsList.appendChild(whistleNode);
                }

                // If officially approved and finished, stop live polling
                if (m.is_official) {
                    isOfficialResult = true;
                    stopPolling();
                }
            }
        }

        function renderEventNode(ev, animate = false) {
            const div = document.createElement('div');
            div.id = `event-row-${ev.id}`;
            div.className = `flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 transition-all ${animate ? 'event-enter' : ''}`;

            let iconHtml = '<span>📌</span>';
            if (['goal', 'penalty_goal'].includes(ev.type)) {
                iconHtml = '<span>⚽</span>';
            } else if (ev.type === 'yellow_card' || (ev.type === 'foul' && ev.punishment === 'yellow')) {
                iconHtml = '<span class="w-3.5 h-4.5 bg-amber-400 rounded-xs inline-block"></span>';
            } else if (ev.type === 'red_card' || (ev.type === 'foul' && ev.punishment === 'red')) {
                iconHtml = '<span class="w-3.5 h-4.5 bg-rose-500 rounded-xs inline-block"></span>';
            } else if (ev.type === 'second_yellow' || (ev.type === 'foul' && ev.punishment === 'second_yellow')) {
                iconHtml = '<span class="text-[10px]">🟨🟥</span>';
            } else if (ev.type === 'substitution') {
                iconHtml = '<span>🔄</span>';
            } else if (ev.type === 'foul') {
                iconHtml = '<span>🛑</span>';
            }

            const goalBadge = ['goal', 'penalty_goal'].includes(ev.type)
                ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">هدف</span>'
                : '';

            const assistText = ev.assist_player_name
                ? `<span>• تمريرة: ${escapeHtml(ev.assist_player_name)}</span>`
                : '';

            div.innerHTML = `
                <span class="text-xs font-black text-slate-400 tabular-nums shrink-0 min-w-8 text-center">${ev.minute}'</span>
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-white shadow-2xs border border-slate-100">
                    ${iconHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-extrabold text-slate-900 truncate">${escapeHtml(ev.player_name || 'حدث')}</span>
                        ${goalBadge}
                    </div>
                    <div class="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                        <span class="truncate text-brand-700">${escapeHtml(ev.team_name || '')}</span>
                        ${assistText}
                    </div>
                </div>
            `;
            return div;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/[&<>"']/g, function(m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
            });
        }

        function startPolling() {
            if (pollTimer || (isMatchFinished && isOfficialResult)) return;
            pollTimer = setInterval(fetchMatchUpdate, 5000);
        }

        function stopPolling() {
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }

        // Tab visibility management: Pause when hidden, resume immediately when visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopPolling();
            } else {
                if (!isMatchFinished || !isOfficialResult) {
                    fetchMatchUpdate(); // immediate sync
                    startPolling();
                }
            }
        });

        // Start polling on load
        if (!isMatchFinished || !isOfficialResult) {
            startPolling();
        }
    </script>
</body>
</html>
