<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terrain_images', function (Blueprint $table) {
            $table->string('thumbnail_path')->nullable()->after('image_path');
        });

        Schema::table('team_gallery_images', function (Blueprint $table) {
            $table->string('thumbnail_path')->nullable()->after('image_path');
        });

        Schema::table('player_gallery_images', function (Blueprint $table) {
            $table->string('thumbnail_path')->nullable()->after('image_path');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->string('logo_thumbnail_path')->nullable()->after('logo_path');
            $table->string('cover_thumbnail_path')->nullable()->after('cover_image_path');
        });

        Schema::table('stadiums', function (Blueprint $table) {
            $table->string('cover_thumbnail_path')->nullable()->after('cover_image');
        });

        Schema::table('player_profiles', function (Blueprint $table) {
            $table->string('photo_thumbnail_path')->nullable()->after('photo_path');
            $table->string('cover_photo_thumbnail_path')->nullable()->after('cover_photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('terrain_images', function (Blueprint $table) {
            $table->dropColumn('thumbnail_path');
        });

        Schema::table('team_gallery_images', function (Blueprint $table) {
            $table->dropColumn('thumbnail_path');
        });

        Schema::table('player_gallery_images', function (Blueprint $table) {
            $table->dropColumn('thumbnail_path');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['logo_thumbnail_path', 'cover_thumbnail_path']);
        });

        Schema::table('stadiums', function (Blueprint $table) {
            $table->dropColumn('cover_thumbnail_path');
        });

        Schema::table('player_profiles', function (Blueprint $table) {
            $table->dropColumn(['photo_thumbnail_path', 'cover_photo_thumbnail_path']);
        });
    }
};
