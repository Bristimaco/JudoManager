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
        $activeFilter = $request->query('active'); // 'true', 'false', or null (all)

        return Member::query()
            ->when($q, function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('first_name', 'like', "%{$q}%")
                        ->orWhere('last_name', 'like', "%{$q}%");
                });
            })
            ->when($activeFilter !== null, function ($query) use ($activeFilter) {
                $query->where('active', $activeFilter === 'true');
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'license_number' => ['required', 'numeric', 'min:1', Rule::unique('members', 'license_number')],
            'email' => ['nullable', 'email', 'max:255'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => ['nullable', 'date'],
            'belt' => ['nullable', 'string', 'max:50'],
            'active' => ['sometimes', 'boolean'],
            'interested_in_competition' => ['sometimes', 'boolean'],
            'age_category' => ['nullable', 'string', 'max:50'],
            'weight_category' => ['nullable', 'string', 'max:50', 'required_with:gender'],
            'gender' => ['nullable', Rule::in(Gender::options())],
        ]);

        // optioneel: active default false indien niet meegestuurd
        // $data['active'] = $request->boolean('active');

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
            'license_number' => ['required', 'numeric', 'min:1', Rule::unique('members', 'license_number')->ignore($member->id)],
            'email' => ['nullable', 'email', 'max:255'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'birthdate' => ['nullable', 'date'],
            'belt' => ['nullable', 'string', 'max:50'],
            'active' => ['sometimes', 'boolean'],
            'interested_in_competition' => ['sometimes', 'boolean'],
            'age_category' => ['nullable', 'string', 'max:50'],
            'weight_category' => ['nullable', 'string', 'max:50', 'required_with:gender'],
            'gender' => ['nullable', Rule::in(Gender::options())], // ✅ FIX
        ]);

        // optioneel: als active aanwezig is, normaliseren naar boolean
        // if ($request->has('active')) $data['active'] = $request->boolean('active');

        $member->update($data);

        return $member;
    }

    public function destroy(Member $member)
    {
        // Controleer of het lid nog actief is
        if ($member->active) {
            return response()->json([
                'message' => 'Actieve leden kunnen niet worden verwijderd. Zet het lid eerst op inactief.',
                'error' => 'active_member_cannot_be_deleted',
                'errors' => [
                    'active' => ['Dit lid is nog actief. Zet het lid eerst op inactief voordat je het verwijdert.']
                ]
            ], 422);
        }

        $member->delete();

        return response()->json(['deleted' => true]);
    }
}
