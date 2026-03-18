<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL: Be very explicit about dropping EVERYTHING related to old constraints
            
            // Drop the constraint if it exists
            DB::statement('
                ALTER TABLE lookups DROP CONSTRAINT IF EXISTS lookups_type_label_gender_unique CASCADE
            ');
            
            // Drop ANY index with these names
            DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_unique');
            DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_age_category_unique');
            
            // Now create the correct one with age_category
            // Use raw index creation to handle COALESCE properly
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS lookups_type_label_gender_age_category_unique
                ON lookups(type, label, gender, COALESCE(age_category, \'\'))
            ');
        } elseif ($driver === 'sqlite') {
            // SQLite: Similar approach
            try {
                DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_unique');
            } catch (\Exception $e) {
                // Might not exist
            }

            try {
                DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_age_category_unique');
            } catch (\Exception $e) {
                // Might already exist
            }

            // Create the new one
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS lookups_type_label_gender_age_category_unique
                ON lookups(type, label, gender, COALESCE(age_category, ""))
            ');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql' || $driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_age_category_unique');
        }
    }
};
