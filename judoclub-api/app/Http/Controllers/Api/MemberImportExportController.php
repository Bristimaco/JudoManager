<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Enums\Gender;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;
use App\DataManagement\Imports\MembersImport;
use App\DataManagement\Exports\MembersExport;

class MemberImportExportController extends Controller
{
    public function export()
    {
        return Excel::download(new MembersExport(), 'members.xlsx');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'], // 10MB
        ]);

        $import = new MembersImport();

        Excel::import($import, $request->file('file'));

        // MembersImport houdt tellers/errors bij
        return response()->json([
            'inserted' => $import->inserted,
            'updated' => $import->updated,
            'skipped' => $import->skipped,
            'errors' => $import->errors, // [{row, field, message}]
        ]);
    }
}