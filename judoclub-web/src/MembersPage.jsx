import { useEffect, useState } from "react";
import { api } from "./api";
import { Link } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button, Input } from "./components/ui";
import { formatDateBE } from "./utils/date";

export default function MembersPage() {
    const [q, setQ] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await api.get("/api/members", {
                params: q ? { q } : {},
                headers: { Accept: "application/json" },
            });
            setItems(res.data?.data ?? []);
        } catch (e) {
            console.error("MEMBERS ERROR", e?.response?.status, e?.response?.data, e);
            setErr(`Laden mislukt (${e?.response?.status ?? "no status"})`);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AppLayout
            title="Leden"
            subtitle="Zoek, open en beheer leden."
            actions={
                <>
                    <Button variant="primary" onClick={load} disabled={loading}>
                        {loading ? "Laden..." : "Refresh"}
                    </Button>
                    <Link to="/members/new">
                        <Button variant="blue">+ Nieuw lid</Button>
                    </Link>
                </>
            }
        >
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Zoek op voornaam of achternaam..."
                    />
                </div>
                <Button variant="primary" onClick={load}>
                    Zoeken
                </Button>
                <Link to="/members/new">
                    <Button variant="blue">+ Nieuw lid</Button>
                </Link>
            </div>

            {err && (
                <div className="mb-4">
                    <Alert variant="error">{err}</Alert>
                </div>
            )}

            {loading ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                    <div className="text-slate-900 font-medium">Geen leden gevonden</div>
                    <div className="text-slate-600 text-sm mt-1">
                        Probeer een andere zoekterm of maak een nieuw lid aan.
                    </div>
                    <div className="mt-4">
                        <Link to="/members/new">
                            <Button variant="blue">+ Nieuw lid</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-600 border-b">
                                <th className="py-3 pr-4">Naam</th>
                                <th className="py-3 pr-4">Geboortedatum</th>
                                <th className="py-3 pr-4">Gordel</th>
                                <th className="py-3 pr-4">Leeftijdscategorie</th>
                                <th className="py-3 pr-4">Gewichtscategorie</th>
                                <th className="py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((m) => (
                                <tr key={m.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                    <td className="py-3 pr-4">
                                        <Link to={`/members/${m.id}`} className="font-medium text-slate-900 hover:underline">
                                            {m.last_name} {m.first_name}
                                        </Link>
                                    </td>
                                    <td className="py-3 pr-4 text-slate-700">{formatDateBE(m.birthdate)}</td>
                                    <td className="py-3 pr-4 text-slate-700">{m.belt ?? "-"}</td>
                                    <td className="py-3 pr-4 text-slate-700">{m.age_category ?? "-"}</td>
                                    <td className="py-3 pr-4 text-slate-700">{m.weight_category ?? "-"}</td>
                                    <td className="py-3">
                                        <Badge tone={m.active ? "ok" : "neutral"}>{m.active ? "Actief" : "Inactief"}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 text-xs text-slate-500">
                        Tip: klik op een naam om te bewerken.
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
