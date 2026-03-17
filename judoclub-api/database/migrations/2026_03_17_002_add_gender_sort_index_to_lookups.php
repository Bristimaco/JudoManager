<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            // Add optimized index for weight_categories filtering by gender
            $table->index(['type', 'gender', 'sort_order'], 'lookups_type_gender_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            $table->dropIndex('lookups_type_gender_sort_idx');
        });
    }
};