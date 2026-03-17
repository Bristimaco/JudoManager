import { useEffect, useState } from "react";
import { api } from "./api";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Button, Input } from "./components/ui";
import DatePickerInput from "./components/DatePickerInput";

export default function TournamentCreatePage() {
    const nav = useNavigate();

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [date, setDate] = useState(""); // ISO yyyy-mm-dd
    const [selectedAgeCategories, setSelectedAgeCategories] = useState(new Set());
    const [description, setDescription] = useState("");
    const [active, setActive] = useState(true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const [ageCategories, setAgeCategories] = useState([]);
    const [ageLoading, setAgeLoading] = useState(true);

    // Helper: ondersteunt zowel array response als paginator {data, meta, links}
    function pluckData(res) {
        if (!res) return [];
        const d = res.data;
        return Array.isArray(d) ? d : (d?.data ?? []);
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

    useEffect(() => {
        loadAgeCategories();
    }, []);

    function fe(name) {
        const msgs = fieldErrors?.[name];
        if (!msgs?.length) return null;
        return <div className="mt-1 text-sm text-red-600">{msgs[0]}</div>;
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

    async function onSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setFieldErrors({});

        try {
            await api.post(
                "/api/tournaments",
                {
                    name: name.trim(),
                    address: address.trim(),
                    date: date || null,
                    age_category_ids: Array.from(selectedAgeCategories),
                    description: description.trim() || null,
                    active,
                },
                { headers: { Accept: "application/json" } }
            );

            nav("/tournaments");
        } catch (e) {
            const status = e?.response?.status;
            const data = e?.response?.data;

            if (status === 422 && data?.errors) {
                setFieldErrors(data.errors);
                setError("Controleer de velden.");
            } else {
                setError(`Opslaan mislukt (${status ?? "no status"})`);
            }
        } finally {
            setSaving(false);
        }
    }

    const disableSubmit = saving || !name.trim() || !address.trim() || !date || selectedAgeCategories.size === 0;

    return (
        <AppLayout
            title="Nieuw Toernooi"
            subtitle="Maak een nieuw toernooi aan."
            actions={
                <Link to="/tournaments">
                    <Button variant="secondary">← Terug</Button>
                </Link>
            }
        >
            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Toernooi Naam *</label>
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="bv. Wintertoernooi 2026" 
                        />
                        {fe("name")}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Datum *</label>
                        <DatePickerInput
                            value={date || null}
                            onChange={(iso) => setDate(iso ?? "")}
                            placeholder="Kies datum..."
                        />
                        {fe("date")}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">Adres *</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Volledige adres: straat, nummer, postcode, stad"
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none transition focus:ring-4 focus:ring-slate-200 focus:border-slate-300 resize-y"
                    />
                    <div className="mt-1 text-xs text-slate-500">
                        Geef het volledige adres op voor kaartfunctionaliteit
                    </div>
                    {fe("address")}
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
                    <label className="block text-sm font-medium text-slate-700">Beschrijving (optioneel)</label>
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
                    <Button variant="primary" type="submit" disabled={disableSubmit}>
                        {saving ? "Opslaan..." : "Toernooi Aanmaken"}
                    </Button>

                    <Link to="/tournaments" className="sm:ml-auto">
                        <Button variant="secondary" type="button">
                            Annuleer
                        </Button>
                    </Link>
                </div>
            </form>
        </AppLayout>
    );
}