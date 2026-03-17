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
        Schema::create('tournaments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('address'); // Volledig adres voor kaartfunctionaliteit
            $table->date('date'); // Datum van het toernooi
            $table->string('age_category'); // Leeftijdscategorie
            $table->text('description')->nullable(); // Optionele beschrijving
            $table->boolean('active')->default(true); // Actief/inactief
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tournaments');
    }
};
