<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('lookups', function (Blueprint $table) {
        $table->id();
        $table->string('type');          // belts, age_categories, weight_categories
        $table->string('label');         // bv. "Groen", "U15", "-60 kg"
        $table->unsignedInteger('sort_order')->default(0);
        $table->boolean('active')->default(true);
        $table->timestamps();

        $table->index(['type', 'sort_order']);
        $table->unique(['type', 'label']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lookups');
    }
};
