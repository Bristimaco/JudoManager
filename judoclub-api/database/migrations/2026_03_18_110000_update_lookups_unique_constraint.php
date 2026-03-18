<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite doesn't support dropping named constraints directly.
        // We need to drop and recreate the unique constraint.
        
        // Get the current table structure and recreate with new constraint
        Schema::table('lookups', function (Blueprint $table) {
            // Drop the old unique constraint by name if it exists
            // In SQLite, we'll use dropUnique with the column names
            try {
                $table->dropUnique(['type', 'label', 'gender']);
            } catch (\Exception $e) {
                // Constraint might not exist or have different name, continue
            }
        });

        // Add new unique constraint that includes age_category
        Schema::table('lookups', function (Blueprint $table) {
            // Since SQLite has limitations, we'll use a composite unique index
            // Remove null values from the uniqueness check
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS lookups_type_label_gender_age_category_unique 
                          ON lookups(type, label, gender, COALESCE(age_category, ""))');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_age_category_unique');
        });

        // Restore old constraint
        Schema::table('lookups', function (Blueprint $table) {
            $table->unique(['type', 'label', 'gender']);
        });
    }
};
