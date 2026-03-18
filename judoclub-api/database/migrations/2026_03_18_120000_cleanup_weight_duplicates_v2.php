<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        // Remove duplicate weight_categories, keeping only the first (MIN id) of each duplicate group
        if ($driver === 'sqlite') {
            DB::statement('
                DELETE FROM lookups WHERE id NOT IN (
                    SELECT MIN(id) FROM lookups 
                    WHERE type = "weight_categories" AND gender IS NOT NULL
                    GROUP BY type, label, gender, COALESCE(age_category, "")
                ) AND type = "weight_categories"
            ');
        } elseif ($driver === 'pgsql') {
            // PostgreSQL: Use window function to handle COALESCE in GROUP BY - keeps first (lowest id) of each group
            DB::statement('
                DELETE FROM lookups WHERE id NOT IN (
                    SELECT DISTINCT ON (type, label, gender, COALESCE(age_category, \'\')) id
                    FROM lookups 
                    WHERE type = \'weight_categories\' AND gender IS NOT NULL
                    ORDER BY type, label, gender, COALESCE(age_category, \'\'), id
                )
            ');
        } else {
            // MySQL: Handle duplicate cleanup
            DB::statement('
                DELETE FROM lookups WHERE id NOT IN (
                    SELECT MIN(id) FROM (
                        SELECT MIN(id) as id FROM lookups 
                        WHERE type = "weight_categories" AND gender IS NOT NULL
                        GROUP BY type, label, gender, IFNULL(age_category, "")
                    ) AS t
                ) AND type = "weight_categories"
            ');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback available - duplicates can't be restored
        // This migration only cleans up, it doesn't create data structures
    }
};
