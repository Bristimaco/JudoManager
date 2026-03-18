<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Change enum to string so the new phase value is accepted.
        // Application-level validation in the controller enforces allowed values.
        Schema::table('tournaments', function (Blueprint $table) {
            $table->string('phase')->default('voorbereiding')->change();
        });
    }

    public function down(): void
    {
        Schema::table('tournaments', function (Blueprint $table) {
            $table->enum('phase', ['voorbereiding', 'inschrijvingen_uitvoeren', 'inschrijvingen_compleet', 'afgelopen'])
                ->default('voorbereiding')
                ->change();
        });
    }
};
