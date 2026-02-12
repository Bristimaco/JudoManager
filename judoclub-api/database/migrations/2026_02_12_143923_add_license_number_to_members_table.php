<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            // SQLite ondersteunt unsignedBigInteger niet echt strikt, maar BIGINT werkt prima.
            $table->unsignedBigInteger('license_number')->nullable()->after('id');
            $table->unique('license_number');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropUnique(['license_number']);
            $table->dropColumn('license_number');
        });
    }
};