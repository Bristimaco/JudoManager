<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lookup;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Enums\Gender;

class LookupController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->query('type');
        $gender = $request->query('gender'); // optioneel voor weight_categories

        $request->validate([
            'type' => ['required', 'string', Rule::in(['belts', 'age_categories', 'weight_categories'])],
            'gender' => ['nullable', Rule::in(\App\Enums\Gender::options())],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $perPage = (int) ($request->query('per_page', 50));

        return Lookup::query()
            ->where('type', $type)
            ->when($type === 'weight_categories' && $gender, fn($q) => $q->where('gender', $gender))
            ->orderByRaw("CASE WHEN gender IS NULL THEN 1 ELSE 0 END")
            ->orderBy('gender')
            ->orderBy('sort_order')
            ->orderBy('label')
            ->paginate($perPage);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['belts', 'age_categories', 'weight_categories'])],

            // Bij weight_categories: gender REQUIRED en moet M/V zijn
            // Bij andere types: gender moet NULL zijn (we strippen het hieronder sowieso)
            'gender' => [
                Rule::requiredIf(fn() => $request->input('type') === 'weight_categories'),
                'nullable',
                Rule::in(Gender::options()),
            ],

            'label' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? 0;

        // Forceer gender = null behalve voor weight_categories
        if ($data['type'] !== 'weight_categories') {
            $data['gender'] = null;
        }

        // Unique per type + gender(NULL-safe) + label
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
            // gender enkel verplicht bij weight_categories
            'gender' => [
                Rule::requiredIf(fn() => $lookup->type === 'weight_categories'),
                'nullable',
                Rule::in(Gender::options()),
            ],
            'label' => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? $lookup->sort_order;

        // Forceer gender = null behalve voor weight_categories
        if ($lookup->type !== 'weight_categories') {
            $data['gender'] = null;
        }

        // Unique per type + gender + label (excluding current)
        $exists = Lookup::where('type', $lookup->type)
            ->where('label', $data['label'])
            ->where('id', '!=', $lookup->id)
            ->when(
                is_null($data['gender']),
                fn($q) => $q->whereNull('gender'),
                fn($q) => $q->where('gender', $data['gender'])
            )
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
