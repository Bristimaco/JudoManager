<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->enum('phase', ['voorbereiding', 'inschrijvingen_uitvoeren', 'afgelopen'])
                ->default('voorbereiding')
                ->after('active');
            $table->date('invitation_deadline')->nullable()->after('phase');
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->dropColumn(['phase', 'invitation_deadline']);
        });
    }
};
