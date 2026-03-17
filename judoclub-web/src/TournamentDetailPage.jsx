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

    const [ageCategories, setAgeCategories] = useState([]);
    const [ageLoading, setAgeLoading] = useState(true);

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
        } catch (e) {
            setError(`Laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAgeCategories();
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

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
            title={tournamentTitle}
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
                {/* Formulier - 2 kolommen */}
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
        </AppLayout>
    );
}