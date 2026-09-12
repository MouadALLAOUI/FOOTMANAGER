<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('match_requests', function (Blueprint $table) {
            $table->string('invitation_token', 64)->nullable()->unique()->after('status');
            $table->boolean('is_guest')->default(false)->after('opponent_team_id');
            $table->string('guest_team_name')->nullable()->after('is_guest');
            $table->string('guest_contact_name')->nullable()->after('guest_team_name');
            $table->string('guest_phone')->nullable()->after('guest_contact_name');
            $table->text('guest_notes')->nullable()->after('guest_phone');
        });

        Schema::create('match_challenge_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('match_request_id')->constrained('match_requests')->cascadeOnDelete();
            $table->enum('type', ['registered', 'guest'])->default('registered');
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('guest_team_name')->nullable();
            $table->string('guest_contact_name')->nullable();
            $table->string('guest_phone')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'accepted', 'declined'])->default('pending');
            $table->timestamps();

            $table->index(['match_request_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_challenge_proposals');

        Schema::table('match_requests', function (Blueprint $table) {
            $table->dropColumn([
                'invitation_token',
                'is_guest',
                'guest_team_name',
                'guest_contact_name',
                'guest_phone',
                'guest_notes',
            ]);
        });
    }
};
