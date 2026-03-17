<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tournament_participants', function (Blueprint $table) {
            $table->string('invitation_token')->nullable()->unique()->after('status');
            $table->enum('response_status', ['pending', 'accepted', 'declined'])->default('pending')->after('invitation_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tournament_participants', function (Blueprint $table) {
            $table->dropColumn(['invitation_token', 'response_status']);
        });
    }
};
