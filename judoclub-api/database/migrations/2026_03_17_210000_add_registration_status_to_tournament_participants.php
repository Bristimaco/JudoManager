<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tournament_participants', function (Blueprint $table) {
            $table->enum('registration_status', ['ingeschreven', 'uitgeschreven', 'verwijderd'])
                ->nullable()
                ->after('response_status');
        });
    }

    public function down(): void
    {
        Schema::table('tournament_participants', function (Blueprint $table) {
            $table->dropColumn('registration_status');
        });
    }
};
