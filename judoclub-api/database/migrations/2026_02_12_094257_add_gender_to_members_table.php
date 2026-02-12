<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    // add_gender_to_members_table.php
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('gender', 10)->nullable()->after('birthdate');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }

};
