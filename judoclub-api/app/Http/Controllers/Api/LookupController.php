<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lookup;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LookupController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type');

        $request->validate([
            'type' => ['required', 'string', Rule::in(['belts', 'age_categories', 'weight_categories'])],
        ]);

        return Lookup::query()
            ->where('type', $type)
            ->orderByRaw("CASE WHEN gender IS NULL THEN 1 ELSE 0 END") // nulls last
            ->orderBy('gender')                                       // M/F eerst
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['belts', 'age_categories', 'weight_categories'])],
            'gender' => [
                Rule::requiredIf(fn() => $request->input('type') === 'weight_categories'),
                'nullable',
                'string',
                'max:10',
            ],
            'label' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? 0;

        if ($data['type'] !== 'weight_categories') {
            $data['gender'] = null;
        } else {
            // bij weight_categories moet gender aanwezig zijn (validatie doet dit),
            // maar zorg dat key zeker bestaat:
            $data['gender'] = $data['gender'] ?? null;
        }

        // Unique per type + (gender/null) + label (NULL-safe)
        $existsQuery = Lookup::where('type', $data['type'])
            ->where('label', $data['label']);

        if (is_null($data['gender'])) {
            $existsQuery->whereNull('gender');
        } else {
            $existsQuery->where('gender', $data['gender']);
        }

        if ($existsQuery->exists()) {
            return response()->json([
                'message' => 'Deze waarde bestaat al voor dit type.',
                'errors' => ['label' => ['Deze waarde bestaat al.']],
            ], 422);
        }

        return response()->json(Lookup::create($data), 201);
    }

    public function update(Request $request, Lookup $lookup)
    {
        $data = $request->validate([
            'gender' => ['required', 'string', 'max:10'],
            'label' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? $lookup->sort_order;

        // unique per type/label (excluding current)
        $exists = Lookup::where('type', $lookup->type)
            ->where('gender', $data['gender'])
            ->where('label', $data['label'])
            ->where('id', '!=', $lookup->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Deze waarde bestaat al voor dit type.',
                'errors' => ['label' => ['Deze waarde bestaat al.']],
            ], 422);
        }

        $lookup->update($data);

        return $lookup;
    }

    public function destroy(Lookup $lookup)
    {
        $lookup->delete();
        return response()->json(['deleted' => true]);
    }
}
