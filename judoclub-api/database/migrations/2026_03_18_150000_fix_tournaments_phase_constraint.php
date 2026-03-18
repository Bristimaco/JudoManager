<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL: Drop the check constraint and convert enum to VARCHAR
            DB::statement('ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_phase_check');
            DB::statement('ALTER TABLE tournaments ALTER COLUMN phase TYPE VARCHAR(255)');
        } elseif ($driver === 'sqlite') {
            // SQLite: Recreate the table if needed (SQLite doesn't support ALTER COLUMN TYPE directly)
            // For SQLite, we just verify the column exists as is
            $columns = Schema::getColumnListing('tournaments');
            if (in_array('phase', $columns)) {
                // Column exists, SQLite will handle it as a string naturally
            }
        }
    }

    public function down(): void
    {
        // Revert not typically needed, but provide a basic version
        // In production, you wouldn't revert this
    }
};

