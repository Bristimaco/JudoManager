import { useEffect, useState } from "react";
import { api } from "./api";
import { Link } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button, Input, Select } from "./components/ui";
import { formatDateBE } from "./utils/date";
import Pagination from "./components/Pagination";

export default function TournamentsPage() {
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("upcoming"); // 'upcoming', 'past', 'all'
    const [phaseFilter, setPhaseFilter] = useState("all"); // 'voorbereiding', 'inschrijvingen_uitvoeren', 'inschrijvingen_compleet', 'afgelopen', 'all'
    const [selectedAgeCategories, setSelectedAgeCategories] = useState(new Set());
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);

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
        } finally {
            setAgeLoading(false);
        }
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
        setPage(1); // Reset naar eerste pagina bij filter wijziging
    }

    async function load() {
        setLoading(true);
        setErr("");

        try {
            const params = { page };
            if (q) params.q = q;
            if (statusFilter === "upcoming") params.status = "upcoming";
            if (statusFilter === "past") params.status = "past";
            if (phaseFilter !== "all") params.phase = phaseFilter;
            if (selectedAgeCategories.size > 0) {
                params.age_category_ids = Array.from(selectedAgeCategories).join(',');
            }

            const res = await api.get("/api/tournaments", {
                params,
                headers: { Accept: "application/json" },
            });

            setItems(res.data?.data ?? []);
            const m = res.data?.meta ?? res.data ?? {};
            setMeta({
                currentPage: m.current_page ?? 1,
                lastPage: m.last_page ?? 1,
                total: m.total ?? 0,
            });
        } catch (e) {
            setErr(`Laden mislukt (${e?.response?.status ?? "no status"})`);
        } finally {
            setLoading(false);
        }
    }

    // Load when page, search term or filters change
    useEffect(() => {
        loadAgeCategories();
    }, []);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, q, statusFilter, phaseFilter, selectedAgeCategories]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [q, statusFilter, phaseFilter]);

    // Helper om status badge te bepalen
    const getStatusBadge = (tournament) => {
        const tournamentDate = new Date(tournament.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        tournamentDate.setHours(0, 0, 0, 0);

        if (tournamentDate >= today) {
            return <Badge tone="ok">Komend</Badge>;
        } else {
            return <Badge tone="neutral">Voorbij</Badge>;
        }
    };

    // Helper om fase badge te bepalen
    const getPhaseBadge = (phase) => {
        const phaseMap = {
            voorbereiding: { label: "Voorbereiding", tone: "neutral" },
            inschrijvingen_uitvoeren: { label: "Inschrijvingen", tone: "info" },
            inschrijvingen_compleet: { label: "Compleet", tone: "ok" },
            afgelopen: { label: "Afgelopen", tone: "neutral" },
        };
        const config = phaseMap[phase] || { label: phase, tone: "neutral" };
        return <Badge tone={config.tone}>{config.label}</Badge>;
    };

    return (
        <AppLayout
            title="Toernooien"
            subtitle="Beheer toernooien en inschrijvingen."
            actions={
                <>
                    <Button variant="primary" onClick={load} disabled={loading}>
                        {loading ? "Laden..." : "Refresh"}
                    </Button>
                    <Link to="/tournaments/new">
                        <Button variant="blue">+ Nieuw Toernooi</Button>
                    </Link>
                </>
            }
        >
            {err && (
                <div className="mb-4">
                    <Alert variant="error">{err}</Alert>
                </div>
            )}

            {/* Zoek & Filter controls */}
            <div className="grid sm:grid-cols-4 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Zoeken</label>
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Zoek op naam..."
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full"
                    >
                        <option value="upcoming">Komende toernooien</option>
                        <option value="past">Voorbije toernooien</option>
                        <option value="all">Alle toernooien</option>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fase</label>
                    <Select
                        value={phaseFilter}
                        onChange={(e) => setPhaseFilter(e.target.value)}
                        className="w-full"
                    >
                        <option value="all">Alle fasen</option>
                        <option value="voorbereiding">Voorbereiding</option>
                        <option value="inschrijvingen_uitvoeren">Inschrijvingen</option>
                        <option value="inschrijvingen_compleet">Compleet</option>
                        <option value="afgelopen">Afgelopen</option>
                    </Select>
                </div>

                <div className="flex items-end">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setQ("");
                            setStatusFilter("upcoming");
                            setPhaseFilter("all");
                            setSelectedAgeCategories(new Set());
                        }}
                        className="w-full"
                    >
                        Reset filters
                    </Button>
                </div>
            </div>

            {/* Leeftijdscategorieën Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                    Leeftijdscategorieën {selectedAgeCategories.size > 0 && `(${selectedAgeCategories.size} geselecteerd)`}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    {ageLoading ? (
                        <div className="col-span-full text-sm text-slate-500">Categorieën laden...</div>
                    ) : ageCategories.length === 0 ? (
                        <div className="col-span-full text-sm text-slate-500">Geen categorieën beschikbaar</div>
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
            </div>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-slate-100 rounded-xl" />
                    <div className="h-12 bg-slate-100 rounded-xl" />
                    <div className="h-12 bg-slate-100 rounded-xl" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-slate-400 text-sm">Geen toernooien gevonden.</div>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-600 border-b">
                                    <th className="py-3 pr-4">Naam</th>
                                    <th className="py-3 pr-4">Datum</th>
                                    <th className="py-3 pr-4">Leeftijdscategorie</th>
                                    <th className="py-3 pr-4">Adres</th>
                                    <th className="py-3 pr-4">Fase</th>
                                    <th className="py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((tournament) => (
                                    <tr key={tournament.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                        <td className="py-3 pr-4">
                                            <Link
                                                to={`/tournaments/${tournament.id}`}
                                                className="font-medium text-slate-900 hover:underline"
                                            >
                                                {tournament.name}
                                            </Link>
                                            {tournament.description && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {tournament.description.length > 100
                                                        ? tournament.description.substring(0, 100) + "..."
                                                        : tournament.description
                                                    }
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-700">{formatDateBE(tournament.date)}</td>
                                        <td className="py-3 pr-4 text-slate-700">
                                            {tournament.age_categories && tournament.age_categories.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-1 max-w-60">
                                                    {tournament.age_categories.map((cat) => (
                                                        <Badge key={cat.id} tone="info" size="sm">
                                                            {cat.label}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Geen categorieën</span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-slate-700">
                                            <div className="max-w-xs truncate" title={tournament.address}>
                                                {tournament.address}
                                            </div>
                                        </td>
                                        <td className="py-3 pr-4">{getPhaseBadge(tournament.phase)}</td>
                                        <td className="py-3">{getStatusBadge(tournament)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 text-xs text-slate-500">
                            Tip: klik op een toernooi naam om te bewerken.
                        </div>
                    </div>

                    <Pagination meta={meta} onPage={setPage} />
                </>
            )}
        </AppLayout>
    );
}