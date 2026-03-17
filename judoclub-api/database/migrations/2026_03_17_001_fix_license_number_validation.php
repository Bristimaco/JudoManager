<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        // Add comment to clarify that license_number should be validated as 'numeric' not 'integer'
        // See MemberController validation rules
    }

    public function down(): void
    {
        // No database changes needed, only validation rule changes
    }
};