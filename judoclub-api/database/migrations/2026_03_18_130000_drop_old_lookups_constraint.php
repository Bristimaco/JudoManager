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
            // PostgreSQL: Drop the OLD unique constraint if it exists
            // This is the constraint that doesn't include age_category
            try {
                DB::statement('DROP CONSTRAINT IF EXISTS lookups_type_label_gender_unique ON lookups');
            } catch (\Exception $e) {
                // Might not exist, that's fine
            }

            // Drop the old index if it exists
            try {
                DB::statement('DROP INDEX IF EXISTS lookups_type_label_gender_unique');
            } catch (\Exception $e) {
                // Might not exist, that's fine
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback needed - we're just removing old constraints
    }
};
