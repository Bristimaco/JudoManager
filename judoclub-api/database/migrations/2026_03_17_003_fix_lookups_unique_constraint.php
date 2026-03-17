<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            // Remove old unique constraint
            $table->dropUnique(['type', 'label']);

            // Add new multi-column unique constraint that handles null gender properly
            // This allows multiple entries with same type+label but different gender
            $table->unique(['type', 'label', 'gender'], 'lookups_type_label_gender_unique');
        });
    }

    public function down(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            $table->dropUnique('lookups_type_label_gender_unique');
            $table->unique(['type', 'label']);
        });
    }
};