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

            <!-- Teams & Big Score Row (Each team logo, name, and score unified in one consistent unit) -->
            <div class="grid grid-cols-3 items-center py-2">
                <!-- Home Team (First team, Right side in RTL) -->
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
                    <h3 id="homeTeamName" class="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1 mb-1.5">
                        {{ $match['home_team']['name'] }}
                    </h3>
                    <!-- Home Team Score Display (Unit with team) -->
                    <div class="inline-flex items-center justify-center min-w-12 px-3 py-1 rounded-2xl bg-white/20 border border-white/25 shadow-inner">
                        <span id="homeScoreText" class="text-2xl sm:text-3xl font-black text-white tabular-nums">{{ $match['home_score'] }}</span>
                    </div>
                </div>

                <!-- Center: Separator & Match Status -->
                <div class="flex flex-col items-center justify-center text-center px-1">
                    <div class="inline-flex items-center justify-center px-3 py-1 rounded-full bg-black/25 border border-white/10 text-emerald-200 text-xs font-black tracking-wider">
                        <span>ضد</span>
                    </div>

                    <!-- Status Pill -->
                    <div id="statusPill" class="mt-2.5">
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

                <!-- Away Team (Second team, Left side in RTL) -->
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
                    <h3 id="awayTeamName" class="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1 mb-1.5">
                        {{ $match['away_team']['name'] }}
                    </h3>
                    <!-- Away Team Score Display (Unit with team) -->
                    <div class="inline-flex items-center justify-center min-w-12 px-3 py-1 rounded-2xl bg-white/20 border border-white/25 shadow-inner">
                        <span id="awayScoreText" class="text-2xl sm:text-3xl font-black text-white tabular-nums">{{ $match['away_score'] }}</span>
                    </div>
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

        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl mb-3 shadow-inner">
            <button type="button" id="tabBtnEvents" onclick="switchMatchTab('events')" class="flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all shadow-xs bg-white text-brand-900 flex items-center justify-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>الأحداث</span>
            </button>
            <button type="button" id="tabBtnLineup" onclick="switchMatchTab('lineup')" class="flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                </svg>
                <span>التشكيلة الحاضرة</span>
            </button>
            <button type="button" id="tabBtnDetails" onclick="switchMatchTab('details')" class="flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
                </svg>
                <span>تفاصيل المباراة</span>
            </button>
        </div>

        <!-- TAB PANE 1: أحداث المباراة (Match Events Feed) -->
        <div id="tabPaneEvents" class="mb-3">
            <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
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

                <!-- Events List (Chronological: Newest First) -->
                <div id="eventsList" class="space-y-2.5">
                    @forelse($events as $event)
                        <div id="event-row-{{ $event['id'] }}" data-event-order="{{ ($event['minute'] * 10000) + $event['id'] }}" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 transition-all">
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

                    <!-- Final Whistle Badge if Finished (Unambiguous Team-Score Matching) -->
                    @if($match['is_finished'])
                        <div id="finalWhistleRow" data-event-order="0" class="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                            <span class="text-xs font-black text-emerald-700 shrink-0 min-w-8 text-center">90'</span>
                            <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm shrink-0">
                                ⏱️
                            </div>
                            <div class="flex-1 min-w-0">
                                <span class="text-xs font-black text-brand-900 block">نهاية المباراة</span>
                                <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-brand-800 mt-0.5" dir="rtl">
                                    <span>النتيجة النهائية:</span>
                                    <span class="font-extrabold text-brand-900">{{ $match['home_team']['name'] }}</span>
                                    <span class="inline-block px-1.5 py-0.5 bg-brand-100 rounded text-brand-950 font-black tabular-nums">{{ $match['home_score'] }}</span>
                                    <span class="text-slate-400">-</span>
                                    <span class="inline-block px-1.5 py-0.5 bg-brand-100 rounded text-brand-950 font-black tabular-nums">{{ $match['away_score'] }}</span>
                                    <span class="font-extrabold text-brand-900">{{ $match['away_team']['name'] }}</span>
                                </div>
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
        </div>

        <!-- TAB PANE 2: التشكيلة الحاضرة (Present Match Lineup) -->
        <div id="tabPaneLineup" class="hidden mb-3">
            <div class="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
                <!-- Section Header -->
                <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-emerald-50 text-brand-600 flex items-center justify-center">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                            </svg>
                        </div>
                        <h2 class="text-sm font-black text-slate-900">التشكيلة الحاضرة</h2>
                    </div>

                    <!-- Team Selector Filter Pills -->
                    <div class="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
                        <button type="button" id="lineupSubBtnAll" onclick="filterLineupTeam('all')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all bg-white text-slate-800 shadow-2xs">الكل</button>
                        <button type="button" id="lineupSubBtnHome" onclick="filterLineupTeam('home')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800">{{ $match['home_team']['name'] }}</button>
                        <button type="button" id="lineupSubBtnAway" onclick="filterLineupTeam('away')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800">{{ $match['away_team']['name'] }}</button>
                    </div>
                </div>

                <!-- Lineup Content -->
                <div id="lineupContent" class="space-y-5">
                    @if(!empty($lineup['available']))
                        <!-- Home Team Lineup Group -->
                        <div id="lineupTeamCardHome" class="space-y-3">
                            <!-- Team Banner -->
                            <div class="flex items-center justify-between bg-emerald-50/70 border border-emerald-100/80 px-3 py-2 rounded-2xl">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-white p-0.5 shadow-2xs flex items-center justify-center overflow-hidden">
                                        @if(!empty($match['home_team']['logo_url']))
                                            <img src="{{ $match['home_team']['logo_url'] }}" alt="{{ $match['home_team']['name'] }}" class="w-full h-full object-contain rounded-full">
                                        @else
                                            <span class="text-[10px] font-black text-brand-600">⚽</span>
                                        @endif
                                    </div>
                                    <span class="text-xs font-black text-emerald-950">{{ $match['home_team']['name'] }}</span>
                                </div>
                                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                                    {{ count($lineup['home']['all'] ?? []) }} لاعبين حاضرين
                                </span>
                            </div>

                            <!-- Starters (if distinguished) -->
                            @if(!empty($lineup['has_starters']) && !empty($lineup['home']['starters']))
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 px-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span>التشكيلة الأساسية</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        @foreach($lineup['home']['starters'] as $p)
                                            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <div class="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        @if(!empty($p['photo_url']))
                                                            <img src="{{ $p['photo_url'] }}" alt="{{ $p['name'] }}" class="w-full h-full object-cover">
                                                        @else
                                                            <span class="text-xs font-black text-brand-700">{{ !empty($p['number']) ? $p['number'] : '👤' }}</span>
                                                        @endif
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-xs font-black text-slate-800 truncate">{{ $p['name'] }}</span>
                                                            @if(!empty($p['is_captain']))
                                                                <span class="text-[9px] font-black bg-amber-100 text-amber-800 px-1 py-0.2 rounded" title="قائد الفريق">C</span>
                                                            @endif
                                                        </div>
                                                        @if(!empty($p['position']))
                                                            <span class="text-[10px] font-bold text-slate-400 block">{{ $p['position'] }}</span>
                                                        @endif
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    @if($p['participation_status'] === 'subbed_out')
                                                        <span class="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <span>🔄</span>
                                                            <span>تم استبداله</span>
                                                        </span>
                                                    @elseif($p['participation_status'] === 'subbed_in')
                                                        <span class="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <span>🔄</span>
                                                            <span>شارك كبديل</span>
                                                        </span>
                                                    @else
                                                        <span class="text-[10px] font-extrabold text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                                                            أساسي
                                                        </span>
                                                    @endif

                                                    @if(!empty($p['number']))
                                                        <span class="text-xs font-black text-slate-700 bg-white border border-slate-200/90 w-6 h-6 rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                                                            {{ $p['number'] }}
                                                        </span>
                                                    @endif
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                </div>
                            @endif

                            <!-- Substitutes (if distinguished) -->
                            @if(!empty($lineup['has_starters']) && !empty($lineup['home']['substitutes']))
                                <div class="space-y-1.5 pt-1">
                                    <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 px-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span>البدلاء</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        @foreach($lineup['home']['substitutes'] as $p)
                                            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <div class="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        @if(!empty($p['photo_url']))
                                                            <img src="{{ $p['photo_url'] }}" alt="{{ $p['name'] }}" class="w-full h-full object-cover">
                                                        @else
                                                            <span class="text-xs font-black text-slate-500">{{ !empty($p['number']) ? $p['number'] : '👤' }}</span>
                                                        @endif
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-xs font-black text-slate-800 truncate">{{ $p['name'] }}</span>
                                                        </div>
                                                        @if(!empty($p['position']))
                                                            <span class="text-[10px] font-bold text-slate-400 block">{{ $p['position'] }}</span>
                                                        @endif
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    @if($p['participation_status'] === 'subbed_in')
                                                        <span class="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <span>🔄</span>
                                                            <span>شارك كبديل</span>
                                                        </span>
                                                    @else
                                                        <span class="text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                            احتياط
                                                        </span>
                                                    @endif

                                                    @if(!empty($p['number']))
                                                        <span class="text-xs font-black text-slate-700 bg-white border border-slate-200/90 w-6 h-6 rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                                                            {{ $p['number'] }}
                                                        </span>
                                                    @endif
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                </div>
                            @endif

                            <!-- All players if starters not distinguished -->
                            @if(empty($lineup['has_starters']) && !empty($lineup['home']['all']))
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    @foreach($lineup['home']['all'] as $p)
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <div class="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    @if(!empty($p['photo_url']))
                                                        <img src="{{ $p['photo_url'] }}" alt="{{ $p['name'] }}" class="w-full h-full object-cover">
                                                    @else
                                                        <span class="text-xs font-black text-brand-700">{{ !empty($p['number']) ? $p['number'] : '👤' }}</span>
                                                    @endif
                                                </div>
                                                <div class="min-w-0">
                                                    <span class="text-xs font-black text-slate-800 truncate block">{{ $p['name'] }}</span>
                                                    @if(!empty($p['position']))
                                                        <span class="text-[10px] font-bold text-slate-400 block">{{ $p['position'] }}</span>
                                                    @endif
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1.5 shrink-0">
                                                <span class="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                    حاضر
                                                </span>
                                                @if(!empty($p['number']))
                                                    <span class="text-xs font-black text-slate-700 bg-white border border-slate-200/90 w-6 h-6 rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                                                        {{ $p['number'] }}
                                                    </span>
                                                @endif
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            @endif
                        </div>

                        <!-- Away Team Lineup Group -->
                        <div id="lineupTeamCardAway" class="space-y-3 pt-3 border-t border-slate-100">
                            <!-- Team Banner -->
                            <div class="flex items-center justify-between bg-slate-100/70 border border-slate-200/70 px-3 py-2 rounded-2xl">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-white p-0.5 shadow-2xs flex items-center justify-center overflow-hidden">
                                        @if(!empty($match['away_team']['logo_url']))
                                            <img src="{{ $match['away_team']['logo_url'] }}" alt="{{ $match['away_team']['name'] }}" class="w-full h-full object-contain rounded-full">
                                        @else
                                            <span class="text-[10px] font-black text-slate-600">⚽</span>
                                        @endif
                                    </div>
                                    <span class="text-xs font-black text-slate-900">{{ $match['away_team']['name'] }}</span>
                                </div>
                                <span class="text-[10px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                                    {{ count($lineup['away']['all'] ?? []) }} لاعبين حاضرين
                                </span>
                            </div>

                            <!-- Starters (if distinguished) -->
                            @if(!empty($lineup['has_starters']) && !empty($lineup['away']['starters']))
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 px-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span>التشكيلة الأساسية</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        @foreach($lineup['away']['starters'] as $p)
                                            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <div class="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        @if(!empty($p['photo_url']))
                                                            <img src="{{ $p['photo_url'] }}" alt="{{ $p['name'] }}" class="w-full h-full object-cover">
                                                        @else
                                                            <span class="text-xs font-black text-slate-600">{{ !empty($p['number']) ? $p['number'] : '👤' }}</span>
                                                        @endif
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-xs font-black text-slate-800 truncate">{{ $p['name'] }}</span>
                                                            @if(!empty($p['is_captain']))
                                                                <span class="text-[9px] font-black bg-amber-100 text-amber-800 px-1 py-0.2 rounded" title="قائد الفريق">C</span>
                                                            @endif
                                                        </div>
                                                        @if(!empty($p['position']))
                                                            <span class="text-[10px] font-bold text-slate-400 block">{{ $p['position'] }}</span>
                                                        @endif
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    @if($p['participation_status'] === 'subbed_out')
                                                        <span class="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <span>🔄</span>
                                                            <span>تم استبداله</span>
                                                        </span>
                                                    @elseif($p['participation_status'] === 'subbed_in')
                                                        <span class="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <span>🔄</span>
                                                            <span>شارك كبديل</span>
                                                        </span>
                                                    @else
                                                        <span class="text-[10px] font-extrabold text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                                                            أساسي
                                                        </span>
                                                    @endif

                                                    @if(!empty($p['number']))
                                                        <span class="text-xs font-black text-slate-700 bg-white border border-slate-200/90 w-6 h-6 rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                                                            {{ $p['number'] }}
                                                        </span>
                                                    @endif
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                </div>
                            @endif

                            <!-- Substitutes (if distinguished) -->
                            @if(!empty($lineup['has_starters']) && !empty($lineup['away']['substitutes']))
                                <div class="space-y-1.5 pt-1">
                                    <div class="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 px-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span>البدلاء</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        @foreach($lineup['away']['substitutes'] as $p)
                                            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <div class="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        @if(!empty($p['photo_url']))
                                                            <img src="{{ $p['photo_url'] }}" alt="{{ $p['name'] }}" class="w-full h-full object-cover">
                                                        @else
                                                            <span class="text-xs font-black text-slate-500">{{ !empty($p['number']) ? $p['number'] : '👤' }}</span>
                                                        @endif
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-xs font-black text-slate-800 truncate">{{ $p['name'] }}</span>
                                                        </div>
                                                        @if(!empty($p['position']))
                                                            <span class="text-[10px] font-bold text-slate-400 block">{{ $p['position'] }}</span>
                                                        @endif
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-1.5 shrink-0">
                                                    @if($p['participation_status'] === 'subbed_in')
                                                        <span class="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                                            <span>🔄</span>
                                                            <span>شارك كبديل</span>
                                                        </span>
                                                    @else
                                                        <span class="text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                            احتياط
                                                        </span>
                                                    @endif

                                                    @if(!empty($p['number']))
                                                        <span class="text-xs font-black text-slate-700 bg-white border border-slate-200/90 w-6 h-6 rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                                                            {{ $p['number'] }}
                                                        </span>
                                                    @endif
                                                </div>
                                            </div>
                                        @endforeach
                                    </div>
                                </div>
                            @endif

                            <!-- All players if starters not distinguished -->
                            @if(empty($lineup['has_starters']) && !empty($lineup['away']['all']))
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    @foreach($lineup['away']['all'] as $p)
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <div class="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    @if(!empty($p['photo_url']))
                                                        <img src="{{ $p['photo_url'] }}" alt="{{ $p['name'] }}" class="w-full h-full object-cover">
                                                    @else
                                                        <span class="text-xs font-black text-slate-600">{{ !empty($p['number']) ? $p['number'] : '👤' }}</span>
                                                    @endif
                                                </div>
                                                <div class="min-w-0">
                                                    <span class="text-xs font-black text-slate-800 truncate block">{{ $p['name'] }}</span>
                                                    @if(!empty($p['position']))
                                                        <span class="text-[10px] font-bold text-slate-400 block">{{ $p['position'] }}</span>
                                                    @endif
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1.5 shrink-0">
                                                <span class="text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                    حاضر
                                                </span>
                                                @if(!empty($p['number']))
                                                    <span class="text-xs font-black text-slate-700 bg-white border border-slate-200/90 w-6 h-6 rounded-full flex items-center justify-center tabular-nums shadow-2xs">
                                                        {{ $p['number'] }}
                                                    </span>
                                                @endif
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            @endif
                        </div>
                    @else
                        <!-- Graceful Empty Lineup State -->
                        <div id="noLineupNotice" class="text-center py-8 px-4 text-slate-400">
                            <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                                </svg>
                            </div>
                            <p class="text-xs font-bold text-slate-700">لم يتم تأكيد تشكيلة المباراة بعد</p>
                            <p class="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">سيتم عرض قائمة اللاعبين الحاضرين والتشكيلة الأساسية فور تأكيدها من قبل طاقم أو منظم المباراة</p>
                        </div>
                    @endif
                </div>
            </div>
        </div>

        <!-- TAB PANE 3: تفاصيل المباراة (Match Details & Venue) -->
        <div id="tabPaneDetails" class="hidden mb-3">
            <div class="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div class="w-7 h-7 rounded-full bg-emerald-50 text-brand-600 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
                        </svg>
                    </div>
                    <h2 class="text-sm font-black text-slate-800">تفاصيل وبيانات المباراة</h2>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 block mb-1">الملعب والموقع</span>
                        <span class="font-extrabold text-slate-800 block">{{ $match['stadium']['name'] }}</span>
                        <span class="text-[11px] text-slate-500 font-bold block">{{ $match['stadium']['city'] }}</span>
                    </div>

                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 block mb-1">البطولة والمرحلة</span>
                        <span class="font-extrabold text-slate-800 block truncate">{{ $match['tournament']['name'] }}</span>
                        <span class="text-[11px] text-brand-700 font-bold block">{{ $match['tournament']['round'] }}</span>
                    </div>

                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 block mb-1">طاقم التحكيم</span>
                        <span class="font-extrabold text-slate-800 block">{{ $match['referee_name'] }}</span>
                    </div>

                    <div class="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span class="text-[10px] font-bold text-slate-400 block mb-1">اعتماد النتيجة</span>
                        <span class="font-extrabold {{ $match['is_official'] ? 'text-emerald-700' : 'text-amber-600' }} block">
                            {{ $match['is_official'] ? 'معتمدة ورسمية' : 'بانتظار الاعتماد النهائي' }}
                        </span>
                    </div>
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
        let isFetching = false;

        // In-memory collection of all displayed events keyed by stable event ID
        const eventsMap = new Map();

        // Pre-populate eventsMap from initial server-rendered events
        @if(!empty($events))
            @foreach($events as $ev)
                eventsMap.set({{ (int) $ev['id'] }}, @json($ev));
            @endforeach
        @endif

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

        // Tab Switching
        function switchMatchTab(tabKey) {
            const tabEvents = document.getElementById('tabPaneEvents');
            const tabLineup = document.getElementById('tabPaneLineup');
            const tabDetails = document.getElementById('tabPaneDetails');

            const btnEvents = document.getElementById('tabBtnEvents');
            const btnLineup = document.getElementById('tabBtnLineup');
            const btnDetails = document.getElementById('tabBtnDetails');

            // Hide all tab panes
            if (tabEvents) tabEvents.classList.add('hidden');
            if (tabLineup) tabLineup.classList.add('hidden');
            if (tabDetails) tabDetails.classList.add('hidden');

            // Reset all buttons to inactive
            [btnEvents, btnLineup, btnDetails].forEach(btn => {
                if (btn) {
                    btn.className = "flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5";
                    const icon = btn.querySelector('svg');
                    if (icon) icon.className = "w-3.5 h-3.5 text-slate-500";
                }
            });

            // Activate chosen tab
            if (tabKey === 'lineup') {
                if (tabLineup) tabLineup.classList.remove('hidden');
                if (btnLineup) {
                    btnLineup.className = "flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all shadow-xs bg-white text-brand-900 flex items-center justify-center gap-1.5";
                    const icon = btnLineup.querySelector('svg');
                    if (icon) icon.className = "w-3.5 h-3.5 text-brand-600";
                }
            } else if (tabKey === 'details') {
                if (tabDetails) tabDetails.classList.remove('hidden');
                if (btnDetails) {
                    btnDetails.className = "flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all shadow-xs bg-white text-brand-900 flex items-center justify-center gap-1.5";
                    const icon = btnDetails.querySelector('svg');
                    if (icon) icon.className = "w-3.5 h-3.5 text-brand-600";
                }
            } else {
                // Default: Events
                if (tabEvents) tabEvents.classList.remove('hidden');
                if (btnEvents) {
                    btnEvents.className = "flex-1 py-2 px-3 text-xs font-black rounded-xl transition-all shadow-xs bg-white text-brand-900 flex items-center justify-center gap-1.5";
                    const icon = btnEvents.querySelector('svg');
                    if (icon) icon.className = "w-3.5 h-3.5 text-brand-600";
                }
            }
        }

        // Lineup Team Filter (All / Home / Away)
        function filterLineupTeam(teamKey) {
            const homeCard = document.getElementById('lineupTeamCardHome');
            const awayCard = document.getElementById('lineupTeamCardAway');

            const btnAll = document.getElementById('lineupSubBtnAll');
            const btnHome = document.getElementById('lineupSubBtnHome');
            const btnAway = document.getElementById('lineupSubBtnAway');

            [btnAll, btnHome, btnAway].forEach(b => {
                if (b) b.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800";
            });

            if (teamKey === 'home') {
                if (homeCard) homeCard.classList.remove('hidden');
                if (awayCard) awayCard.classList.add('hidden');
                if (btnHome) btnHome.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all bg-white text-slate-800 shadow-2xs";
            } else if (teamKey === 'away') {
                if (homeCard) homeCard.classList.add('hidden');
                if (awayCard) awayCard.classList.remove('hidden');
                if (btnAway) btnAway.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all bg-white text-slate-800 shadow-2xs";
            } else {
                if (homeCard) homeCard.classList.remove('hidden');
                if (awayCard) awayCard.classList.remove('hidden');
                if (btnAll) btnAll.className = "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all bg-white text-slate-800 shadow-2xs";
            }
        }

        // Incremental Polling Function with concurrency guard
        async function fetchMatchUpdate() {
            if (!isPollingActive || isFetching) return;
            isFetching = true;

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
            } finally {
                isFetching = false;
            }
        }

        function applyMatchUpdate(data) {
            if (!data || !data.match) return;

            const m = data.match;
            lastServerTime = data.server_time || lastServerTime;

            // Update scores
            const homeScoreEl = document.getElementById('homeScoreText');
            const awayScoreEl = document.getElementById('awayScoreText');
            if (homeScoreEl) homeScoreEl.innerText = m.home_score;
            if (awayScoreEl) awayScoreEl.innerText = m.away_score;

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

            // Deduplicated Event Feed Update using eventsMap
            const eventsList = document.getElementById('eventsList');
            const noEventsNotice = document.getElementById('noEventsNotice');

            // Handle updated events (e.g. player name corrected by committee or score correction)
            if (Array.isArray(data.updated_events) && data.updated_events.length > 0) {
                data.updated_events.forEach(ev => {
                    eventsMap.set(ev.id, ev);
                    const existingRow = document.getElementById(`event-row-${ev.id}`);
                    if (existingRow) {
                        existingRow.replaceWith(renderEventNode(ev, false));
                    }
                });
            }

            // Handle newly arrived events with strict ID check and chronological insertion
            if (Array.isArray(data.events) && data.events.length > 0) {
                if (noEventsNotice) noEventsNotice.remove();

                // Sort arriving events so older items are inserted first if multiple events arrive
                const sortedArriving = [...data.events].sort((a, b) => {
                    const orderA = (parseInt(a.minute, 10) || 0) * 10000 + (parseInt(a.id, 10) || 0);
                    const orderB = (parseInt(b.minute, 10) || 0) * 10000 + (parseInt(b.id, 10) || 0);
                    return orderA - orderB;
                });

                sortedArriving.forEach(ev => {
                    const evId = parseInt(ev.id, 10);
                    const alreadyExists = eventsMap.has(evId) || document.getElementById(`event-row-${evId}`);

                    if (alreadyExists) {
                        // Already exists: update in place without re-duplicating
                        eventsMap.set(evId, ev);
                        const row = document.getElementById(`event-row-${evId}`);
                        if (row) {
                            row.replaceWith(renderEventNode(ev, false));
                        }
                    } else {
                        // Brand new event: record in map and insert into DOM maintaining newest-first order
                        eventsMap.set(evId, ev);
                        insertEventInChronologicalOrder(eventsList, ev);
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
                if (!document.getElementById('finalWhistleRow') && eventsList) {
                    const whistleNode = document.createElement('div');
                    whistleNode.id = 'finalWhistleRow';
                    whistleNode.className = 'flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80';
                    whistleNode.innerHTML = `
                        <span class="text-xs font-black text-emerald-700 shrink-0 min-w-8 text-center">90'</span>
                        <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm shrink-0">⏱️</div>
                        <div class="flex-1 min-w-0">
                            <span class="text-xs font-black text-brand-900 block">نهاية المباراة</span>
                            <span class="text-[10px] font-bold text-brand-700">النتيجة النهائية: <bdi>${escapeHtml(m.home_team.name)}</bdi> ${m.home_score} - ${m.away_score} <bdi>${escapeHtml(m.away_team.name)}</bdi></span>
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

        // Inserts an event into eventsList adhering to descending order (newest first)
        function insertEventInChronologicalOrder(container, ev) {
            const newNode = renderEventNode(ev, true);
            const evOrder = (parseInt(ev.minute, 10) || 0) * 10000 + (parseInt(ev.id, 10) || 0);
            newNode.setAttribute('data-event-order', evOrder);

            const children = Array.from(container.children);
            let inserted = false;

            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child.id === 'finalWhistleRow') continue; // Whistle row stays at the bottom or top depending on convention
                const childOrder = parseInt(child.getAttribute('data-event-order'), 10) || 0;
                if (evOrder > childOrder) {
                    container.insertBefore(newNode, child);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                // If not inserted before any existing row, append before final whistle row if present
                const whistle = document.getElementById('finalWhistleRow');
                if (whistle) {
                    container.insertBefore(newNode, whistle);
                } else {
                    container.appendChild(newNode);
                }
            }
        }

        function renderEventNode(ev, animate = false) {
            const div = document.createElement('div');
            div.id = `event-row-${ev.id}`;
            const evOrder = (parseInt(ev.minute, 10) || 0) * 10000 + (parseInt(ev.id, 10) || 0);
            div.setAttribute('data-event-order', evOrder);
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
