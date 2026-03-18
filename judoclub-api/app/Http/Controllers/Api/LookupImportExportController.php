<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\DataManagement\Imports\LookupsImport;
use App\DataManagement\Exports\LookupsExport;

class LookupImportExportController extends Controller
{
    public function export(Request $request)
    {
        $type = $request->query('type');
        
        if (!$type || !in_array($type, ['belts', 'age_categories', 'weight_categories'])) {
            return response()->json(['error' => 'Invalid lookup type'], 400);
        }

        // Nice filenames
        $fileNames = [
            'belts' => 'gordels.xlsx',
            'age_categories' => 'leeftijdscategorieen.xlsx',
            'weight_categories' => 'gewichtscategorieen.xlsx',
        ];

        return Excel::download(new LookupsExport($type), $fileNames[$type]);
    }

    public function import(Request $request)
    {
        $type = $request->query('type');
        
        if (!$type || !in_array($type, ['belts', 'age_categories', 'weight_categories'])) {
            return response()->json(['error' => 'Invalid lookup type'], 400);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:5120'], // 5MB
        ]);

        $import = new LookupsImport($type);
        Excel::import($import, $request->file('file'));

        return response()->json([
            'inserted' => $import->inserted,
            'updated' => $import->updated,
            'skipped' => $import->skipped,
            'errors' => $import->errors,
        ]);
    }
}
