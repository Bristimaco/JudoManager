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
        Schema::table('lookups', function (Blueprint $table) {
            // For weight_categories, link to which age_category they belong to (e.g., "U15", "U18")
            $table->string('age_category')->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            $table->dropColumn('age_category');
        });
    }
};
