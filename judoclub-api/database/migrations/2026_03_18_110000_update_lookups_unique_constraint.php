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

        // First: Remove duplicates before creating constraint
        // Keep only the first (MIN id) of each duplicate group
        if ($driver === 'sqlite') {
            DB::statement('
                DELETE FROM lookups WHERE id NOT IN (
                    SELECT MIN(id) FROM lookups 
                    WHERE type = "weight_categories" AND gender IS NOT NULL
                    GROUP BY type, label, gender, COALESCE(age_category, "")
                ) AND type = "weight_categories"
            ');
        } elseif ($driver === 'pgsql') {
            DB::statement('
                DELETE FROM lookups WHERE id NOT IN (
                    SELECT MIN(id) FROM lookups 
                    WHERE type = \'weight_categories\' AND gender IS NOT NULL
                    GROUP BY type, label, gender, COALESCE(age_category, \'\')
                ) AND type = \'weight_categories\'
            ');
        }

        // Now create the constraint
        if ($driver === 'sqlite') {
            // SQLite: Drop old index if exists and create new one
            try {
                DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_unique');
            } catch (\Exception $e) {
                // Index might not exist, that's OK
            }

            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS lookups_type_label_gender_age_category_unique 
                          ON lookups(type, label, gender, COALESCE(age_category, ""))');
        } elseif ($driver === 'pgsql') {
            // PostgreSQL: Drop old index if exists and create new one with COALESCE
            try {
                DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_unique');
            } catch (\Exception $e) {
                // Index might not exist, that's OK
            }

            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS lookups_type_label_gender_age_category_unique 
                          ON lookups(type, label, gender, COALESCE(age_category, ''))");
        } else {
            // MySQL or other: Use a composite unique key
            Schema::table('lookups', function (Blueprint $table) {
                try {
                    $table->dropUnique(['type', 'label', 'gender']);
                } catch (\Exception $e) {
                    // Constraint might not exist
                }
                $table->unique(['type', 'label', 'gender', 'age_category']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite' || $driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_age_category_unique');
        } else {
            Schema::table('lookups', function (Blueprint $table) {
                $table->dropUnique(['type', 'label', 'gender', 'age_category']);
            });
        }

        // Restore old constraint for non-index databases
        if ($driver === 'mysql' || $driver === 'mariadb') {
            Schema::table('lookups', function (Blueprint $table) {
                $table->unique(['type', 'label', 'gender']);
            });
        }
    }
};

