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
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['belts', 'age_categories', 'weight_categories'])],
            'label' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? 0;

        // unique per type/label
        $exists = Lookup::where('type', $data['type'])
            ->where('label', $data['label'])
            ->exists();

        if ($exists) {
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
            'label' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? $lookup->sort_order;

        // unique per type/label (excluding current)
        $exists = Lookup::where('type', $lookup->type)
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
