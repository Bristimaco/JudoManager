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
    const [activeFilter, setActiveFilter] = useState("active"); // 'active', 'inactive', 'all'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);

    async function load() {
        setLoading(true);
        setErr("");

        try {
            const params = { page };
            if (q) params.q = q;
            if (statusFilter === "upcoming") params.status = "upcoming";
            if (statusFilter === "past") params.status = "past";
            if (activeFilter === "active") params.active = "true";
            if (activeFilter === "inactive") params.active = "false";

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
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, q, statusFilter, activeFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [q, statusFilter, activeFilter]);

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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Actief</label>
                    <Select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="w-full"
                    >
                        <option value="active">Actieve toernooien</option>
                        <option value="inactive">Inactieve toernooien</option>
                        <option value="all">Alle toernooien</option>
                    </Select>
                </div>

                <div className="flex items-end">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setQ("");
                            setStatusFilter("upcoming");
                            setActiveFilter("active");
                        }}
                        className="w-full"
                    >
                        Reset filters
                    </Button>
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
                                    <th className="py-3 pr-4">Status</th>
                                    <th className="py-3">Actief</th>
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
                                                <div className="flex flex-wrap gap-1">
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
                                        <td className="py-3 pr-4">{getStatusBadge(tournament)}</td>
                                        <td className="py-3">
                                            <Badge tone={tournament.active ? "ok" : "neutral"}>
                                                {tournament.active ? "Actief" : "Inactief"}
                                            </Badge>
                                        </td>
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