import { useEffect, useState } from "react";
import { api } from "./api";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button, Input } from "./components/ui";
import DatePickerInput from "./components/DatePickerInput";
import { formatDateBE } from "./utils/date";

// Simple Map component using OpenStreetMap
function AddressMap({ address }) {
    const [mapUrl, setMapUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!address) {
            setLoading(false);
            return;
        }

        // Use OpenStreetMap Nominatim for geocoding (free, no API key needed)
        const geocodeAddress = async () => {
            try {
                const encodedAddress = encodeURIComponent(address);
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
                );
                const data = await response.json();

                if (data && data.length > 0) {
                    const { lat, lon } = data[0];
                    // Create OpenStreetMap embed URL
                    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${parseFloat(lon) + 0.01},${parseFloat(lat) + 0.01}&layer=mapnik&marker=${lat},${lon}`;
                    setMapUrl(osmUrl);
                } else {
                    setError("Adres niet gevonden op kaart");
                }
            } catch (err) {
                setError("Kon kaart niet laden");
            } finally {
                setLoading(false);
            }
        };

        geocodeAddress();
    }, [address]);

    if (!address) {
        return (
            <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                Geen adres opgegeven
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm animate-pulse">
                Kaart laden...
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
            <iframe
                src={mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Kaart van ${address}`}
            />
        </div>
    );
}

export default function TournamentDetailPage() {
    const { id } = useParams();
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [date, setDate] = useState(""); // ISO yyyy-mm-dd
    const [selectedAgeCategories, setSelectedAgeCategories] = useState(new Set());
    const [flyer, setFlyer] = useState(null);
    const [currentFlyerPath, setCurrentFlyerPath] = useState("");
    const [description, setDescription] = useState("");
    const [active, setActive] = useState(true);
    const [phase, setPhase] = useState("voorbereiding");
    const [invitationDeadline, setInvitationDeadline] = useState("");

    const [ageCategories, setAgeCategories] = useState([]);
    const [ageLoading, setAgeLoading] = useState(true);

    // Eligible members state
    const [eligibleMembers, setEligibleMembers] = useState([]);
    const [fetchingMembers, setFetchingMembers] = useState(false);
    const [membersLoaded, setMembersLoaded] = useState(false);
    const [membersError, setMembersError] = useState("");

    // Email invitation state
    const [sendingInvitations, setSendingInvitations] = useState(false);
    const [invitationResult, setInvitationResult] = useState(null);

    // Participant removal state
    const [removingParticipant, setRemovingParticipant] = useState(null);

    // Send invitation to individual participant state
    const [sendingInvitationToMember, setSendingInvitationToMember] = useState(null);

    // Confirm registration state
    const [confirmingRegistration, setConfirmingRegistration] = useState(null);
    const [registrationConfirmResult, setRegistrationConfirmResult] = useState(null);
    const [unregisteringParticipant, setUnregisteringParticipant] = useState(null);
    const [removingFromList, setRemovingFromList] = useState(null);
    const [completingRegistrations, setCompletingRegistrations] = useState(false);
    const [completeResult, setCompleteResult] = useState(null);

    // Add participant state
    const [availableMembers, setAvailableMembers] = useState([]);
    const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [availableMembersLoaded, setAvailableMembersLoaded] = useState(false);

    // Collapsible non-accepted participants
    const [expandedNonAccepted, setExpandedNonAccepted] = useState(false);

    // Helper: ondersteunt zowel array response als paginator {data, meta, links}
    function pluckData(res) {
        if (!res) return [];
        const d = res.data;
        return Array.isArray(d) ? d : (d?.data ?? []);
    }

    function toggleAgeCategory(categoryId) {
        setSelectedAgeCategories((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    }

    async function fetchEligibleMembers() {
        setFetchingMembers(true);
        setMembersError("");

        try {
            const res = await api.get(`/api/tournaments/${id}/eligible-members`, {
                headers: { Accept: "application/json" }
            });

            setEligibleMembers(res.data.eligible_members || []);
            setMembersLoaded(true);
        } catch (e) {
            setMembersError(`Leden ophalen mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        } finally {
            setFetchingMembers(false);
        }
    }

    async function fetchAvailableMembers() {
        try {
            const res = await api.get(`/api/tournaments/${id}/available-members`, {
                headers: { Accept: "application/json" }
            });
            setAvailableMembers(res.data || []);
            setAvailableMembersLoaded(true);
        } catch (e) {
            console.error("Error fetching available members:", e);
        }
    }

    async function refreshAndAddAllEligibleMembers() {
        setFetchingMembers(true);
        setMembersError("");

        try {
            // Fetch available (eligible, not yet participant) members
            const availRes = await api.get(`/api/tournaments/${id}/available-members`, {
                headers: { Accept: "application/json" }
            });

            const availableToAdd = availRes.data.available_members || [];

            // Add all available members as participants
            for (const member of availableToAdd) {
                try {
                    await api.post(`/api/tournaments/${id}/participants`, {
                        member_id: member.id
                    }, { headers: { Accept: "application/json" } });
                } catch (e) {
                    console.error(`Failed to add ${member.first_name} ${member.last_name}:`, e);
                }
            }

            // Reload full tournament data to get complete participant info
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) {
                setEligibleMembers(tournamentRes.data.eligible_members);
                setMembersLoaded(true);
            }

            // Refresh available members dropdown (should now be empty)
            await fetchAvailableMembers();

            setInvitationResult({
                type: 'success',
                message: availableToAdd.length > 0
                    ? `${availableToAdd.length} leden toegevoegd aan het toernooi`
                    : 'Lijst is up-to-date, geen nieuwe leden om toe te voegen'
            });
        } catch (e) {
            setMembersError(`Verversen mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        } finally {
            setFetchingMembers(false);
        }
    }

    async function sendInvitations() {
        setSendingInvitations(true);
        setInvitationResult(null);

        try {
            const res = await api.post(`/api/tournaments/${id}/send-invitations`, {}, {
                headers: { Accept: "application/json" }
            });

            setInvitationResult({
                type: 'success',
                message: res.data.message,
                invitedCount: res.data.invited_count,
                errors: res.data.errors || []
            });

            // Reload full tournament data to get updated statuses
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) {
                setEligibleMembers(tournamentRes.data.eligible_members);
            }
        } catch (e) {
            setInvitationResult({
                type: 'error',
                message: `Uitnodigingen versturen mislukt (${e?.response?.status ?? e?.message ?? "no status"})`
            });
        } finally {
            setSendingInvitations(false);
        }
    }

    async function removeParticipant(member) {
        const confirmMessage = member.participant_status === 'invited'
            ? `Ben je zeker dat je ${member.first_name} ${member.last_name} wilt afzeggen? Er wordt een afmeldmail verstuurd.`
            : `Ben je zeker dat je ${member.first_name} ${member.last_name} wilt verwijderen van dit toernooi?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setRemovingParticipant(member.id);

        try {
            const res = await api.delete(`/api/tournaments/${id}/participants/${member.id}`, {
                headers: { Accept: "application/json" }
            });

            setInvitationResult({
                type: 'success',
                message: res.data.message
            });

            // Remove member completely from the list
            setEligibleMembers(prevMembers =>
                prevMembers.filter(m => m.id !== member.id)
            );

            // Also refresh available members
            await fetchAvailableMembers();
        } catch (e) {
            setInvitationResult({
                type: 'error',
                message: `Verwijderen mislukt: ${e?.response?.data?.message || e?.message || "Onbekende fout"}`
            });
        } finally {
            setRemovingParticipant(null);
        }
    }

    async function confirmRegistration(member) {
        setConfirmingRegistration(member.id);
        setRegistrationConfirmResult(null);
        try {
            const res = await api.post(
                `/api/tournaments/${id}/participants/${member.id}/confirm-registration`,
                {},
                { headers: { Accept: "application/json" } }
            );
            setRegistrationConfirmResult({ type: 'success', message: res.data.message });
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) setEligibleMembers(tournamentRes.data.eligible_members);
        } catch (e) {
            setRegistrationConfirmResult({
                type: 'error',
                message: e?.response?.data?.message || e?.message || "Onbekende fout"
            });
        } finally {
            setConfirmingRegistration(null);
        }
    }

    async function unregisterParticipant(member) {
        if (!window.confirm(`Ben je zeker dat je ${member.first_name} ${member.last_name} wilt uitschrijven? Er wordt een uitschrijvingsmail verstuurd.`)) {
            return;
        }
        setUnregisteringParticipant(member.id);
        try {
            await api.post(
                `/api/tournaments/${id}/participants/${member.id}/unregister`,
                {},
                { headers: { Accept: "application/json" } }
            );
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) setEligibleMembers(tournamentRes.data.eligible_members);
        } catch (e) {
            setRegistrationConfirmResult({
                type: 'error',
                message: e?.response?.data?.message || e?.message || "Uitschrijven mislukt"
            });
        } finally {
            setUnregisteringParticipant(null);
        }
    }

    async function removeFromRegistrationList(member) {
        if (!window.confirm(`Ben je zeker dat je ${member.first_name} ${member.last_name} wilt verplaatsen naar de overige deelnemers?`)) {
            return;
        }
        setRemovingFromList(member.id);
        try {
            await api.post(
                `/api/tournaments/${id}/participants/${member.id}/remove-from-registration-list`,
                {},
                { headers: { Accept: "application/json" } }
            );
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) setEligibleMembers(tournamentRes.data.eligible_members);
        } catch (e) {
            setRegistrationConfirmResult({
                type: 'error',
                message: e?.response?.data?.message || e?.message || "Verwijderen mislukt"
            });
        } finally {
            setRemovingFromList(null);
        }
    }

    async function completeRegistrationsAction() {
        setCompletingRegistrations(true);
        setCompleteResult(null);
        try {
            const res = await api.post(
                `/api/tournaments/${id}/complete-registrations`,
                {},
                { headers: { Accept: "application/json" } }
            );
            setCompleteResult({ type: 'success', message: res.data.message });
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) setEligibleMembers(tournamentRes.data.eligible_members);
            if (tournamentRes.data.phase) setPhase(tournamentRes.data.phase);
        } catch (e) {
            setCompleteResult({
                type: 'error',
                message: e?.response?.data?.message || e?.message || "Onbekende fout",
                not_registered: e?.response?.data?.not_registered || [],
            });
        } finally {
            setCompletingRegistrations(false);
        }
    }

    async function inviteMember(member) {
        if (!window.confirm(`Stuur een uitnodiging naar ${member.first_name} ${member.last_name}?`)) {
            return;
        }

        setSendingInvitationToMember(member.id);

        try {
            // First add as participant if not yet
            if (!member.is_participant) {
                await api.post(`/api/tournaments/${id}/participants`, {
                    member_id: member.id
                }, { headers: { Accept: "application/json" } });
            }

            // Then send the invitation
            const res = await api.post(`/api/tournaments/${id}/participants/${member.id}/send-invitation`, {}, {
                headers: { Accept: "application/json" }
            });

            setInvitationResult({ type: 'success', message: res.data.message });
            await fetchEligibleMembers();
        } catch (e) {
            setInvitationResult({
                type: 'error',
                message: `Uitnodiging versturen mislukt: ${e?.response?.data?.message || e?.message || "Onbekende fout"}`
            });
        } finally {
            setSendingInvitationToMember(null);
        }
    }

    async function sendInvitationToMember(member) {
        const confirmMessage = `Verstuur een uitnodiging naar ${member.first_name} ${member.last_name}?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setSendingInvitationToMember(member.id);

        try {
            const res = await api.post(`/api/tournaments/${id}/participants/${member.id}/send-invitation`, {}, {
                headers: { Accept: "application/json" }
            });

            setInvitationResult({
                type: 'success',
                message: res.data.message
            });

            // Reload full tournament data to get updated statuses
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) {
                setEligibleMembers(tournamentRes.data.eligible_members);
            }
        } catch (e) {
            setInvitationResult({
                type: 'error',
                message: `Uitnodiging versturen mislukt: ${e?.response?.data?.message || e?.message || "Onbekende fout"}`
            });
        } finally {
            setSendingInvitationToMember(null);
        }
    }

    async function fetchAvailableMembers() {
        try {
            const res = await api.get(`/api/tournaments/${id}/available-members`, {
                headers: { Accept: "application/json" }
            });

            setAvailableMembers(res.data.available_members || []);
            setAvailableMembersLoaded(true);
        } catch (e) {
            console.error('Error fetching available members:', e);
        }
    }

    async function addParticipant() {
        if (!selectedMemberToAdd) {
            return;
        }

        setAddingParticipant(true);

        try {
            const res = await api.post(`/api/tournaments/${id}/participants`, {
                member_id: selectedMemberToAdd
            }, {
                headers: { Accept: "application/json" }
            });

            setInvitationResult({
                type: 'success',
                message: res.data.message
            });

            setSelectedMemberToAdd("");

            // Reload full tournament data to get complete participant info (license, weight, etc.)
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) {
                setEligibleMembers(tournamentRes.data.eligible_members);
            }

            await fetchAvailableMembers();
        } catch (e) {
            setInvitationResult({
                type: 'error',
                message: e?.response?.data?.message || `Toevoegen mislukt: ${e?.message || "Onbekende fout"}`
            });
        } finally {
            setAddingParticipant(false);
        }
    }

    async function addParticipantById(memberId) {
        setAddingParticipant(true);

        try {
            const res = await api.post(`/api/tournaments/${id}/participants`, {
                member_id: memberId
            }, {
                headers: { Accept: "application/json" }
            });

            setInvitationResult({
                type: 'success',
                message: res.data.message
            });

            await Promise.all([
                fetchEligibleMembers(),
                fetchAvailableMembers()
            ]);
        } catch (e) {
            setInvitationResult({
                type: 'error',
                message: e?.response?.data?.message || `Toevoegen mislukt: ${e?.message || "Onbekende fout"}`
            });
        } finally {
            setAddingParticipant(false);
        }
    }

    async function loadAgeCategories() {
        setAgeLoading(true);
        try {
            const res = await api.get("/api/lookups", {
                params: { type: "age_categories", per_page: 200 },
                headers: { Accept: "application/json" },
            });

            const data = pluckData(res);
            setAgeCategories(data.filter((x) => x.active));
        } catch (e) {
            setAgeCategories([]);
            setError((prev) => prev || `Leeftijdscategorieën laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        } finally {
            setAgeLoading(false);
        }
    }

    async function load() {
        setLoading(true);
        setError("");
        try {
            const res = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            const tournament = res.data;

            setName(tournament.name ?? "");
            setAddress(tournament.address ?? "");
            setDate(tournament.date ? String(tournament.date).split("T")[0] : "");
            // Convert age categories array to Set of IDs
            const categoryIds = new Set(
                (tournament.age_categories || []).map(cat => cat.id)
            );
            setSelectedAgeCategories(categoryIds);
            setCurrentFlyerPath(tournament.flyer ?? "");
            setDescription(tournament.description ?? "");
            setActive(!!tournament.active);
            setPhase(tournament.phase ?? "voorbereiding");
            setInvitationDeadline(tournament.invitation_deadline ? String(tournament.invitation_deadline).split("T")[0] : "");

            // Load current participants from tournament.eligible_members (which are current participants)
            if (tournament.eligible_members) {
                setEligibleMembers(tournament.eligible_members);
                setMembersLoaded(true);
            }
        } catch (e) {
            setError(`Laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        } finally {
            setLoading(false);
        }
    }

    // Load tournament data with current participants from tournament.participants
    async function loadTournamentData() {
        await load(); // This loads tournament.participants
        if (id) {
            await fetchAvailableMembers(); // For the dropdown re-add feature
        }
    }

    useEffect(() => {
        loadAgeCategories();
        loadTournamentData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Refresh participant data when user returns to this tab (e.g. after editing a member)
    useEffect(() => {
        async function onFocus() {
            if (!membersLoaded) return;
            const tournamentRes = await api.get(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            if (tournamentRes.data.eligible_members) {
                setEligibleMembers(tournamentRes.data.eligible_members);
            }
        }
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, membersLoaded]);

    function fe(name) {
        const msgs = fieldErrors?.[name];
        if (!msgs?.length) return null;
        return <div className="mt-1 text-sm text-red-600">{msgs[0]}</div>;
    }

    async function onSave(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setFieldErrors({});

        try {
            // Use FormData for file upload
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('address', address.trim());
            formData.append('date', date || '');
            Array.from(selectedAgeCategories).forEach((id, index) => {
                formData.append(`age_category_ids[${index}]`, id);
            });
            if (flyer) {
                formData.append('flyer', flyer);
            }
            formData.append('description', description.trim() || '');
            formData.append('active', active ? '1' : '0');
            formData.append('phase', phase);
            if (invitationDeadline) formData.append('invitation_deadline', invitationDeadline);

            await api.put(
                `/api/tournaments/${id}`,
                formData,
                {
                    headers: {
                        Accept: "application/json",
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            await load();
        } catch (e) {
            const status = e?.response?.status;
            const data = e?.response?.data;

            if (status === 422 && data?.errors) {
                setFieldErrors(data.errors);
                setError("Controleer de velden.");
            } else {
                setError(`Opslaan mislukt (${status ?? e?.message ?? "no status"})`);
            }
        } finally {
            setSaving(false);
        }
    }

    async function onDelete() {
        const ok = window.confirm("Ben je zeker dat je dit toernooi wil verwijderen?");
        if (!ok) return;

        setDeleting(true);
        setError("");

        try {
            await api.delete(`/api/tournaments/${id}`, { headers: { Accept: "application/json" } });
            nav("/tournaments");
        } catch (e) {
            const status = e?.response?.status;
            const data = e?.response?.data;
            setError(`Verwijderen mislukt (${status ?? e?.message ?? "no status"})`);
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <AppLayout title="Toernooi laden..." subtitle="Gegevens laden...">
                <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
            </AppLayout>
        );
    }

    // Stel de naam samen voor de titel
    const tournamentTitle = name || `Toernooi #${id}`;

    return (
        <AppLayout
            widetitle={tournamentTitle}
            subtitle="Bewerk toernooi gegevens."
            actions={
                <>
                    <Link to="/tournaments">
                        <Button variant="secondary">← Terug</Button>
                    </Link>
                    <Badge tone={active ? "ok" : "neutral"}>{active ? "Actief" : "Inactief"}</Badge>
                </>
            }
        >
            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Formulier + Zijbalk */}
                <div className="lg:col-span-2">
                    <form onSubmit={onSave} className="grid gap-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Toernooi Naam</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                                {fe("name")}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Datum</label>
                                <DatePickerInput
                                    value={date || null}
                                    onChange={(iso) => setDate(iso ?? "")}
                                    placeholder="Kies datum..."
                                />
                                {date && <div className="mt-1 text-xs text-slate-500">Weergave: {formatDateBE(date)}</div>}
                                {fe("date")}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Adres</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Volledige adres: straat, nummer, postcode, stad"
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:ring-4 focus:ring-slate-200 focus:border-slate-300 resize-y"
                            />
                            {fe("address")}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Flyer</label>
                            {currentFlyerPath && (
                                <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-sm font-medium text-slate-700 mb-2">Huidige flyer:</div>
                                    <a
                                        href={`http://localhost:8000/storage/${currentFlyerPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 underline text-sm"
                                    >
                                        {currentFlyerPath.split('/').pop()}
                                    </a>
                                </div>
                            )}
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setFlyer(e.target.files[0] || null)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                            />
                            <div className="mt-1 text-xs text-slate-500">
                                Upload een nieuwe flyer (PDF, JPG, PNG - max 5MB) of behoud huidige
                            </div>
                            {fe("flyer")}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Leeftijdscategorieën *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                                    {ageLoading ? (
                                        <div className="text-sm text-slate-500 col-span-full">Categorieën laden...</div>
                                    ) : ageCategories.length === 0 ? (
                                        <div className="text-sm text-slate-500 col-span-full">Geen categorieën beschikbaar</div>
                                    ) : (
                                        ageCategories.map((cat) => (
                                            <label key={cat.id} className="flex items-center gap-2 select-none cursor-pointer hover:bg-slate-100 p-2 rounded text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAgeCategories.has(cat.id)}
                                                    onChange={() => toggleAgeCategory(cat.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                                                />
                                                <span className="text-sm text-slate-700">{cat.label}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    Selecteer alle leeftijdscategorieën waarvoor dit toernooi bedoeld is
                                </div>
                                {fe("age_category_ids")}
                            </div>

                            <div className="flex items-end">
                                <label className="flex items-center gap-3 select-none">
                                    <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={(e) => setActive(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                                    />
                                    <span className="text-sm text-slate-700">Actief toernooi</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Fase</label>
                                <select
                                    value={phase}
                                    onChange={(e) => setPhase(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:ring-4 focus:ring-slate-200 focus:border-slate-300"
                                >
                                    <option value="voorbereiding">Voorbereiding</option>
                                    <option value="inschrijvingen_uitvoeren">Inschrijvingen uitvoeren</option>
                                    <option value="inschrijvingen_compleet" disabled>Inschrijvingen compleet (via knop)</option>
                                    <option value="afgelopen">Afgelopen</option>
                                </select>
                                {fe("phase")}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Uitnodiging accepteren tegen</label>
                                <DatePickerInput
                                    value={invitationDeadline || null}
                                    onChange={(iso) => setInvitationDeadline(iso ?? "")}
                                    placeholder="Kies deadline..."
                                />
                                {invitationDeadline && <div className="mt-1 text-xs text-slate-500">Weergave: {formatDateBE(invitationDeadline)}</div>}
                                {fe("invitation_deadline")}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Beschrijving</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Aanvullende informatie over het toernooi..."
                                rows={4}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:ring-4 focus:ring-slate-200 focus:border-slate-300 resize-y"
                            />
                            {fe("description")}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button variant="primary" type="submit" disabled={saving}>
                                {saving ? "Opslaan..." : "Opslaan"}
                            </Button>

                            <Button
                                variant="danger"
                                type="button"
                                onClick={onDelete}
                                disabled={deleting}
                                className="sm:ml-auto"
                                title="Verwijder dit toernooi"
                            >
                                {deleting ? "Verwijderen..." : "Verwijder"}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Kaart - 1 kolom */}
                <div className="lg:col-span-1">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 mb-2">Locatie</h3>
                            <AddressMap address={address} />
                        </div>

                        {address && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="text-sm font-medium text-slate-700 mb-2">Adres</div>
                                <div className="text-sm text-slate-600">{address}</div>
                                <div className="mt-3">
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Open in Google Maps →
                                    </a>
                                </div>
                            </div>
                        )}

                        {currentFlyerPath && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="text-sm font-medium text-slate-700 mb-2">Flyer</div>
                                <div className="space-y-2">
                                    {currentFlyerPath.toLowerCase().endsWith('.pdf') ? (
                                        <div>
                                            <a
                                                href={`http://localhost:8000/storage/${currentFlyerPath}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                            >
                                                📄 PDF bekijken →
                                            </a>
                                        </div>
                                    ) : (
                                        <div>
                                            <img
                                                src={`http://localhost:8000/storage/${currentFlyerPath}`}
                                                alt="Toernooi flyer"
                                                className="w-full rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                                                onClick={() => window.open(`http://localhost:8000/storage/${currentFlyerPath}`, '_blank')}
                                            />
                                            <div className="text-xs text-slate-500 mt-1">
                                                Klik op de afbeelding om te vergroten
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Deelnemers */}
            <div className="mt-6 border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                    <h3 className="text-base font-medium text-slate-800">Deelnemers</h3>
                </div>

                <div className="px-4 py-4">
                    {(phase === 'inschrijvingen_uitvoeren' || phase === 'afgelopen') && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            De inschrijvingsperiode is afgesloten. Deelnemers kunnen niet meer worden toegevoegd of verwijderd.
                        </div>
                    )}
                    {phase === 'inschrijvingen_compleet' && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                            &#10003; Inschrijvingen zijn compleet. Alle deelnemers zijn ingeschreven.
                        </div>
                    )}

                    {phase === 'voorbereiding' && (
                        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <Button
                                variant="blue"
                                size="sm"
                                onClick={refreshAndAddAllEligibleMembers}
                                disabled={fetchingMembers}
                            >
                                {fetchingMembers ? "Verversen..." : "Ververs leden"}
                            </Button>

                            {membersLoaded && eligibleMembers.some(m => m.is_participant && m.participant_status === 'eligible') && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={sendInvitations}
                                    disabled={sendingInvitations}
                                >
                                    {sendingInvitations ? "Verzenden..." : "Verstuur uitnodigingen"}
                                </Button>
                            )}

                            {/* Deelnemer toevoegen via dropdown */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedMemberToAdd}
                                    onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                                    disabled={!availableMembersLoaded || availableMembers.length === 0}
                                    className="text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                >
                                    <option value="">
                                        {!availableMembersLoaded
                                            ? "Leden laden..."
                                            : availableMembers.length === 0
                                                ? "Geen beschikbare leden"
                                                : "-- Lid toevoegen --"}
                                    </option>
                                    {availableMembers.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.first_name} {member.last_name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={addParticipant}
                                    disabled={!selectedMemberToAdd || addingParticipant || !availableMembersLoaded}
                                >
                                    {addingParticipant ? "Toevoegen..." : "Toevoegen"}
                                </Button>
                            </div>

                            {fetchingMembers && <span className="text-sm text-slate-600">Leden ophalen...</span>}
                        </div>
                    )}

                    {membersError && (
                        <div className="text-sm text-red-600 mb-3 p-3 bg-red-50 rounded-lg">
                            {membersError}
                        </div>
                    )}

                    {invitationResult && (
                        <div className={`text-sm mb-3 p-3 rounded-lg ${invitationResult.type === 'success' ? 'text-green-800 bg-green-50' : 'text-red-800 bg-red-50'
                            }`}>
                            <div className="font-medium">{invitationResult.message}</div>
                            {invitationResult.errors && invitationResult.errors.length > 0 && (
                                <div className="mt-2 text-xs">
                                    <div className="font-medium">Problemen:</div>
                                    <ul className="list-disc list-inside">
                                        {invitationResult.errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {registrationConfirmResult && (
                        <div className={`text-sm mb-3 p-3 rounded-lg ${registrationConfirmResult.type === 'success' ? 'text-green-800 bg-green-50' : 'text-red-800 bg-red-50'}`}>
                            <div className="font-medium">{registrationConfirmResult.message}</div>
                        </div>
                    )}

                    {phase === 'inschrijvingen_uitvoeren' && (
                        <div className="mb-4">
                            <Button
                                variant="success"
                                size="sm"
                                onClick={completeRegistrationsAction}
                                disabled={completingRegistrations}
                            >
                                {completingRegistrations ? 'Bezig...' : 'Sluit inschrijvingen af'}
                            </Button>
                            {completeResult && (
                                <div className={`mt-2 text-sm p-3 rounded-lg ${completeResult.type === 'success' ? 'text-green-800 bg-green-50' : 'text-red-800 bg-red-50'}`}>
                                    <div className="font-medium">{completeResult.message}</div>
                                    {completeResult.not_registered && completeResult.not_registered.length > 0 && (
                                        <ul className="mt-1 list-disc list-inside text-xs">
                                            {completeResult.not_registered.map(p => (
                                                <li key={p.id}>{p.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {membersLoaded && (() => {
                        // Build age category order map from the loaded lookup list
                        const ageCategoryOrder = {};
                        ageCategories.forEach((cat, idx) => { ageCategoryOrder[cat.label] = idx; });

                        const parseWeight = (w) => {
                            if (!w) return Infinity;
                            const n = parseFloat(w.replace(/[+\-\s]/g, '').split('-')[0]);
                            return isNaN(n) ? Infinity : n;
                        };

                        const sortParticipants = (list) => [...list].sort((a, b) => {
                            const ageDiff = (ageCategoryOrder[a.calculated_age_category] ?? 999) -
                                (ageCategoryOrder[b.calculated_age_category] ?? 999);
                            if (ageDiff !== 0) return ageDiff;
                            return parseWeight(a.weight_category) - parseWeight(b.weight_category);
                        });

                        const acceptedParticipants = sortParticipants(
                            eligibleMembers.filter(m => m.response_status === 'accepted' && m.registration_status !== 'verwijderd' && m.registration_status !== 'uitgeschreven')
                        );
                        const nonAcceptedParticipants = eligibleMembers.filter(m => m.response_status !== 'accepted' || m.registration_status === 'verwijderd' || m.registration_status === 'uitgeschreven');

                        const renderMemberRow = (member, showActions = true) => (
                            <tr key={member.id} className="hover:bg-slate-50 transition">
                                <td className="border border-slate-300 px-3 py-2 text-sm text-slate-800 font-medium">
                                    {member.license_number || '-'}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-sm text-slate-800">
                                    <span className="flex items-center gap-1.5">
                                        {member.first_name} {member.last_name}
                                        <a
                                            href={`/members/${member.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Lidkaart openen"
                                            className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </span>
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-sm text-slate-800">
                                    {member.gender === 'M' ? 'Man' : member.gender === 'V' ? 'Vrouw' : '-'}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-sm text-slate-800">
                                    {member.calculated_age_category}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-sm text-slate-800">
                                    {member.weight_category || '-'}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-sm text-slate-800">
                                    {member.email || '-'}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-sm">
                                    {!member.is_participant ? (
                                        <Badge tone="neutral">Nog niet toegevoegd</Badge>
                                    ) : member.response_status === 'accepted' ? (
                                        <>
                                            <Badge tone="ok">✓ Geaccepteerd</Badge>
                                            {member.invited_at && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {new Date(member.invited_at).toLocaleDateString('nl-NL')}
                                                </div>
                                            )}
                                            {member.registration_status === 'ingeschreven' && (
                                                <div className="text-xs text-emerald-700 font-medium mt-1">Ingeschreven</div>
                                            )}
                                            {member.registration_status === 'uitgeschreven' && (
                                                <div className="text-xs text-amber-700 font-medium mt-1">Uitgeschreven</div>
                                            )}
                                        </>
                                    ) : member.response_status === 'declined' ? (
                                        <>
                                            <Badge tone="critical">✗ Afgewezen</Badge>
                                            {member.invited_at && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {new Date(member.invited_at).toLocaleDateString('nl-NL')}
                                                </div>
                                            )}
                                        </>
                                    ) : member.participant_status === 'invited' ? (
                                        <>
                                            <Badge tone="warning">Uitgenodigd</Badge>
                                            {member.invited_at && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {new Date(member.invited_at).toLocaleDateString('nl-NL')}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Badge tone="neutral">Nog niet uitgenodigd</Badge>
                                    )}
                                </td>
                                {showActions && <td className="border border-slate-300 px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {member.is_participant && phase === 'inschrijvingen_uitvoeren' && member.response_status === 'accepted' && (
                                            <>
                                                {/* No registration_status yet → confirm button */}
                                                {!member.registration_status && (
                                                    <button
                                                        onClick={() => confirmRegistration(member)}
                                                        disabled={confirmingRegistration === member.id}
                                                        className="text-emerald-600 hover:text-emerald-800 disabled:text-emerald-300 transition-colors"
                                                        title="Inschrijving bevestigen (stuur bevestigingsmail)"
                                                    >
                                                        {confirmingRegistration === member.id ? (
                                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                {/* Ingeschreven → uitschrijven button */}
                                                {member.registration_status === 'ingeschreven' && (
                                                    <button
                                                        onClick={() => unregisterParticipant(member)}
                                                        disabled={unregisteringParticipant === member.id}
                                                        className="text-amber-600 hover:text-amber-800 disabled:text-amber-300 transition-colors"
                                                        title="Uitschrijven (stuur uitschrijvingsmail)"
                                                    >
                                                        {unregisteringParticipant === member.id ? (
                                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                {/* Uitgeschreven → trash button to move to overige */}
                                                {member.registration_status === 'uitgeschreven' && (
                                                    <button
                                                        onClick={() => removeFromRegistrationList(member)}
                                                        disabled={removingFromList === member.id}
                                                        className="text-red-600 hover:text-red-800 disabled:text-red-300 transition-colors"
                                                        title="Verplaats naar overige deelnemers"
                                                    >
                                                        {removingFromList === member.id ? (
                                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {member.is_participant && phase === 'voorbereiding' && (
                                            <>
                                                {member.participant_status === 'eligible' && (
                                                    <button
                                                        onClick={() => inviteMember(member)}
                                                        disabled={sendingInvitationToMember === member.id}
                                                        className="text-blue-600 hover:text-blue-800 disabled:text-blue-300 transition-colors"
                                                        title="Verstuur uitnodiging"
                                                    >
                                                        {sendingInvitationToMember === member.id ? (
                                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => removeParticipant(member)}
                                                    disabled={removingParticipant === member.id}
                                                    className="text-red-600 hover:text-red-800 disabled:text-red-300 transition-colors"
                                                    title={member.participant_status === 'invited' ? 'Afzeggen en afmeldmail versturen' : 'Verwijder van toernooi'}
                                                >
                                                    {removingParticipant === member.id ? (
                                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>}
                            </tr>
                        );

                        const participantTable = (rows, showActions = true) => (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-slate-300">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Licentie</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Naam</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Geslacht</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Leeftijdscategorie</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Gewichtsklasse</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Email</th>
                                            <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
                                            {showActions && <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700">Actie</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {rows.map(m => renderMemberRow(m, showActions))}
                                    </tbody>
                                </table>
                            </div>
                        );

                        if (phase === 'voorbereiding') {
                            // Één lijst met alle deelnemers
                            return (
                                <div>
                                    <div className="text-sm text-slate-600 mb-3">
                                        <strong>{eligibleMembers.length}</strong> deelnemer{eligibleMembers.length !== 1 ? 's' : ''}
                                    </div>
                                    {eligibleMembers.length > 0 ? (
                                        participantTable(eligibleMembers)
                                    ) : (
                                        <div className="text-sm text-slate-500 italic py-4 text-center">
                                            Geen deelnemers toegevoegd
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Gesplitste weergave vanaf 'inschrijvingen_uitvoeren'
                        return (
                            <div>
                                {/* Bevestigde deelnemers */}
                                <div className="text-sm text-slate-600 mb-3">
                                    <strong>{acceptedParticipants.length}</strong> bevestigde deelnemer{acceptedParticipants.length !== 1 ? 's' : ''}
                                </div>

                                {acceptedParticipants.length > 0 ? (
                                    <div className="mb-4">
                                        {participantTable(acceptedParticipants)}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 italic py-4 text-center mb-4">
                                        Geen bevestigde deelnemers
                                    </div>
                                )}

                                {/* Overige deelnemers (inklapbaar) */}
                                {nonAcceptedParticipants.length > 0 && (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedNonAccepted(v => !v)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
                                        >
                                            <span>Overige deelnemers ({nonAcceptedParticipants.length})</span>
                                            <svg
                                                className={`w-4 h-4 transition-transform ${expandedNonAccepted ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {expandedNonAccepted && (
                                            <div className="p-3">
                                                {participantTable(nonAcceptedParticipants, false)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {!membersLoaded && (
                        <div className="text-sm text-slate-500 text-center py-4">
                            {fetchingMembers ? "Leden worden opgehaald..." : "Leden laden..."}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}