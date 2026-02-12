<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    // add_gender_to_lookups_table.php
    public function up(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            $table->string('gender', 10)->nullable()->after('type');
            $table->index(['type', 'gender']);
        });
    }

    public function down(): void
    {
        Schema::table('lookups', function (Blueprint $table) {
            $table->dropIndex(['type', 'gender']);
            $table->dropColumn('gender');
        });
    }

};
