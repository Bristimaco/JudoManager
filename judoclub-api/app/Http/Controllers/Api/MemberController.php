<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\Request;
use App\Enums\Gender;
use Illuminate\Validation\Rule;

class MemberController extends Controller
{
    public function index(Request $request)
    {
        $q = $request->query('q');

        return Member::query()
            ->when($q, function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('first_name', 'like', "%{$q}%")
                        ->orWhere('last_name', 'like', "%{$q}%");
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => ['nullable', 'date'],
            'belt' => ['nullable', 'string', 'max:50'],
            'active' => ['sometimes', 'boolean'],
            'age_category' => ['nullable', 'string', 'max:50'],
            'weight_category' => ['nullable', 'string', 'max:50'],
            'gender' => ['nullable', Rule::in(Gender::options())],
        ]);

        $member = Member::create($data);

        return response()->json($member, 201);
    }

    public function show(Member $member)
    {
        return $member;
    }

    public function update(Request $request, Member $member)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => ['nullable', 'date'],
            'belt' => ['nullable', 'string', 'max:50'],
            'active' => ['sometimes', 'boolean'],
            'age_category' => ['nullable', 'string', 'max:50'],
            'weight_category' => ['nullable', 'string', 'max:50'],
            'gender' => ['nullable', 'in:male,female'],
        ]);

        $member->update($data);

        return $member;
    }

    public function destroy(Member $member)
    {
        $member->delete();

        return response()->json(['deleted' => true]);
    }
}
