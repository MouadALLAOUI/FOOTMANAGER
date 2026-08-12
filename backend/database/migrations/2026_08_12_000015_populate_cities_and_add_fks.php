<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // Helper to normalize city names for matching
        $normalize = fn($name) => Str::lower(trim(preg_replace('/\s+/', ' ', $name)));

        // 1. Collect unique city strings from stadiums, teams, player_profiles
        $rawCities = collect();

        // From stadiums (required field)
        $stadiumCities = DB::table('stadiums')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->pluck('city')
            ->map(fn($c) => ['source' => 'stadiums', 'name' => $c, 'normalized' => $normalize($c)])
            ->filter(fn($c) => $c['normalized'] !== '')
            ->values();

        // From teams (nullable)
        $teamCities = DB::table('teams')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->pluck('city')
            ->map(fn($c) => ['source' => 'teams', 'name' => $c, 'normalized' => $normalize($c)])
            ->filter(fn($c) => $c['normalized'] !== '')
            ->values();

        // From player_profiles (nullable)
        $playerCities = DB::table('player_profiles')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->pluck('city')
            ->map(fn($c) => ['source' => 'player_profiles', 'name' => $c, 'normalized' => $normalize($c)])
            ->filter(fn($c) => $c['normalized'] !== '')
            ->values();

        $allRaw = $stadiumCities->merge($teamCities)->merge($playerCities);

        // 2. Normalize obvious duplicates (merge by normalized name)
        // Build a map: normalized -> { canonical_name, sources[] }
        $cityMap = [];
        foreach ($allRaw as $raw) {
            $norm = $raw['normalized'];
            if (!isset($cityMap[$norm])) {
                $cityMap[$norm] = [
                    'canonical' => $raw['name'],
                    'sources' => [$raw['source']],
                    'original_names' => [$raw['name']],
                ];
            } else {
                $cityMap[$norm]['sources'][] = $raw['source'];
                $cityMap[$norm]['original_names'][] = $raw['name'];
            }
        }

        // 3. Pre-defined Moroccan cities with translations (from simpleFrontend i18n)
        // These will be used as canonical records if they match existing data
        $moroccanCities = [
            'casablanca'    => ['name' => 'Casablanca',    'name_ar' => 'الدار البيضاء', 'name_fr' => 'Casablanca',    'name_en' => 'Casablanca'],
            'rabat'         => ['name' => 'Rabat',         'name_ar' => 'الرباط',         'name_fr' => 'Rabat',         'name_en' => 'Rabat'],
            'marrakech'     => ['name' => 'Marrakech',     'name_ar' => 'مراكش',           'name_fr' => 'Marrakech',     'name_en' => 'Marrakech'],
            'fes'           => ['name' => 'Fes',           'name_ar' => 'فاس',             'name_fr' => 'Fès',           'name_en' => 'Fes'],
            'tangier'       => ['name' => 'Tangier',       'name_ar' => 'طنجة',            'name_fr' => 'Tanger',        'name_en' => 'Tangier'],
            'agadir'        => ['name' => 'Agadir',        'name_ar' => 'أكادير',          'name_fr' => 'Agadir',        'name_en' => 'Agadir'],
            'ouarzazate'    => ['name' => 'Ouarzazate',    'name_ar' => 'ورزازات',         'name_fr' => 'Ouarzazate',    'name_en' => 'Ouarzazate'],
            'errachidia'    => ['name' => 'Errachidia',    'name_ar' => 'الراشدية',        'name_fr' => 'Errachidia',    'name_en' => 'Errachidia'],
            'tinghir'       => ['name' => 'Tinghir',       'name_ar' => 'تنغير',            'name_fr' => 'Tinghir',       'name_en' => 'Tinghir'],
            // Additional common Moroccan cities
            'meknes'        => ['name' => 'Meknes',        'name_ar' => 'مكناس',           'name_fr' => 'Meknès',        'name_en' => 'Meknes'],
            'kenitra'       => ['name' => 'Kenitra',       'name_ar' => 'القنيطرة',        'name_fr' => 'Kénitra',       'name_en' => 'Kenitra'],
            'tetouan'       => ['name' => 'Tetouan',       'name_ar' => 'تطوان',           'name_fr' => 'Tétouan',       'name_en' => 'Tetouan'],
            'safi'          => ['name' => 'Safi',          'name_ar' => 'آسفي',            'name_fr' => 'Safi',          'name_en' => 'Safi'],
            'el jadida'     => ['name' => 'El Jadida',     'name_ar' => 'الجديدة',         'name_fr' => 'El Jadida',     'name_en' => 'El Jadida'],
            'nador'         => ['name' => 'Nador',         'name_ar' => 'الناظور',         'name_fr' => 'Nador',         'name_en' => 'Nador'],
            'khouribga'     => ['name' => 'Khouribga',     'name_ar' => 'خريبكة',          'name_fr' => 'Khouribga',     'name_en' => 'Khouribga'],
            'berrechid'     => ['name' => 'Berrechid',     'name_ar' => 'برشيد',           'name_fr' => 'Berrechid',     'name_en' => 'Berrechid'],
            'settat'        => ['name' => 'Settat',        'name_ar' => 'سطات',            'name_fr' => 'Settat',        'name_en' => 'Settat'],
            'khemisset'     => ['name' => 'Khemisset',     'name_ar' => 'الخميسات',        'name_fr' => 'Khémisset',     'name_en' => 'Khemisset'],
            'beni mellal'   => ['name' => 'Beni Mellal',   'name_ar' => 'بني ملال',         'name_fr' => 'Béni Mellal',   'name_en' => 'Beni Mellal'],
            'oujda'         => ['name' => 'Oujda',         'name_ar' => 'وجدة',            'name_fr' => 'Oujda',         'name_en' => 'Oujda'],
        ];

        // 4. Merge: use predefined translations for known Moroccan cities
        // For unknown cities, use the canonical name from data
        $toInsert = [];
        $sortOrder = 0;

        foreach ($cityMap as $norm => $info) {
            $slug = Str::slug($norm);
            $predefined = $moroccanCities[$norm] ?? null;

            $toInsert[] = [
                'name'         => $predefined['name'] ?? $info['canonical'],
                'name_ar'      => $predefined['name_ar'] ?? null,
                'name_fr'      => $predefined['name_fr'] ?? null,
                'name_en'      => $predefined['name_en'] ?? null,
                'slug'         => $slug,
                'is_active'    => true,
                'sort_order'   => $predefined ? $sortOrder++ : 900 + $sortOrder++,
                'created_at'   => now(),
                'updated_at'   => now(),
            ];
        }

        // Also add any predefined Moroccan cities not found in existing data
        $existingNorms = array_keys($cityMap);
        foreach ($moroccanCities as $norm => $data) {
            if (!in_array($norm, $existingNorms, true)) {
                $toInsert[] = [
                    'name'         => $data['name'],
                    'name_ar'      => $data['name_ar'],
                    'name_fr'      => $data['name_fr'],
                    'name_en'      => $data['name_en'],
                    'slug'         => Str::slug($norm),
                    'is_active'    => true,
                    'sort_order'   => $sortOrder++,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ];
            }
        }

        // 5. Insert cities
        if (!empty($toInsert)) {
            DB::table('cities')->insert($toInsert);
        }

        // 6. Build mapping: normalized_city_name -> city_id
        $cityIdMap = DB::table('cities')
            ->select('id', 'name')
            ->get()
            ->mapWithKeys(function ($city) use ($normalize) {
                return [$normalize($city->name) => $city->id];
            })
            ->toArray();

        // 7. Add city_id columns (nullable first for safe migration)
        Schema::table('stadiums', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('set null')->after('city');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('set null')->after('city');
        });

        Schema::table('player_profiles', function (Blueprint $table) {
            $table->foreignId('city_id')->nullable()->constrained('cities')->onDelete('set null')->after('city');
        });

        // 8. Populate city_id on stadiums
        $stadiumUpdates = DB::table('stadiums')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->get(['id', 'city'])
            ->map(function ($s) use ($cityIdMap, $normalize) {
                $norm = $normalize($s->city);
                return $cityIdMap[$norm] ? ['id' => $s->id, 'city_id' => $cityIdMap[$norm]] : null;
            })
            ->filter()
            ->values();

        foreach ($stadiumUpdates->chunk(100) as $chunk) {
            foreach ($chunk as $update) {
                DB::table('stadiums')->where('id', $update['id'])->update(['city_id' => $update['city_id']]);
            }
        }

        // 9. Populate city_id on teams
        $teamUpdates = DB::table('teams')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->get(['id', 'city'])
            ->map(function ($t) use ($cityIdMap, $normalize) {
                $norm = $normalize($t->city);
                return $cityIdMap[$norm] ? ['id' => $t->id, 'city_id' => $cityIdMap[$norm]] : null;
            })
            ->filter()
            ->values();

        foreach ($teamUpdates->chunk(100) as $chunk) {
            foreach ($chunk as $update) {
                DB::table('teams')->where('id', $update['id'])->update(['city_id' => $update['city_id']]);
            }
        }

        // 10. Populate city_id on player_profiles
        $playerUpdates = DB::table('player_profiles')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->get(['id', 'city'])
            ->map(function ($p) use ($cityIdMap, $normalize) {
                $norm = $normalize($p->city);
                return $cityIdMap[$norm] ? ['id' => $p->id, 'city_id' => $cityIdMap[$norm]] : null;
            })
            ->filter()
            ->values();

        foreach ($playerUpdates->chunk(100) as $chunk) {
            foreach ($chunk as $update) {
                DB::table('player_profiles')->where('id', $update['id'])->update(['city_id' => $update['city_id']]);
            }
        }

        // 11. Create index on city_id for query performance
        Schema::table('stadiums', function (Blueprint $table) {
            $table->index('city_id', 'stadiums_city_id_idx');
        });
        Schema::table('teams', function (Blueprint $table) {
            $table->index('city_id', 'teams_city_id_idx');
        });
        Schema::table('player_profiles', function (Blueprint $table) {
            $table->index('city_id', 'player_profiles_city_id_idx');
        });

        // 12. Report: cities that could not be matched (for manual review)
        $unmatchedStadiums = DB::table('stadiums')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->whereNull('city_id')
            ->distinct()
            ->pluck('city');

        $unmatchedTeams = DB::table('teams')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->whereNull('city_id')
            ->distinct()
            ->pluck('city');

        $unmatchedPlayers = DB::table('player_profiles')
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->whereNull('city_id')
            ->distinct()
            ->pluck('city');

        $unmatched = $unmatchedStadiums->merge($unmatchedTeams)->merge($unmatchedPlayers)->unique()->values();

        if ($unmatched->isNotEmpty()) {
            // Log for manual review - these city strings didn't match any city record
            \Log::warning('Cities requiring manual review (no match in cities table):', $unmatched->toArray());
        }
    }

    public function down(): void
    {
        // Drop foreign keys and columns
        Schema::table('stadiums', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
            $table->dropIndex('stadiums_city_id_idx');
        });
        Schema::table('teams', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
            $table->dropIndex('teams_city_id_idx');
        });
        Schema::table('player_profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('city_id');
            $table->dropIndex('player_profiles_city_id_idx');
        });

        Schema::dropIfExists('cities');
    }
};