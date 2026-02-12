import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Button, Input, Badge } from "./components/ui";
import { api } from "./api";

const titles = {
    belts: { title: "Gordels", subtitle: "Beheer gordels." },
    age_categories: { title: "Leeftijdscategorieën", subtitle: "Beheer leeftijdsgroepen." },
    weight_categories: { title: "Gewichtscategorieën", subtitle: "Beheer gewichtsklassen." },
};

export default function LookupListPage() {
    const { type } = useParams();
    const meta = titles[type] ?? { title: "Instellingen", subtitle: "" };

    const [items, setItems] = useState([]);
    const [label, setLabel] = useState("");
    const [gender, setGender] = useState(""); // geen default hardcoded
    const [sortOrder, setSortOrder] = useState("0");
    const [active, setActive] = useState(true);

    const [genderMeta, setGenderMeta] = useState(null); // { values: [...], labels: {...} }

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await api.get("/api/lookups", {
                params: { type },
                headers: { Accept: "application/json" },
            });
            setItems(res.data ?? []);
        } catch (e) {
            setErr(`Laden mislukt (${e?.response?.status ?? "no status"})`);
        } finally {
            setLoading(false);
        }
    }

    async function loadMeta() {
        // enkel nodig als we weight_categories beheren
        if (type !== "weight_categories") {
            setGenderMeta(null);
            setGender("");
            return;
        }

        setErr("");
        try {
            const res = await api.get("/api/meta", { headers: { Accept: "application/json" } });
            const g = res?.data?.genders;

            if (!g?.values?.length) {
                setGenderMeta(null);
                setGender("");
                setErr("Meta gegevens bevatten geen genders (genders.values is leeg).");
                return;
            }

            setGenderMeta(g);
            // default: eerste enum waarde
            setGender((prev) => (prev && g.values.includes(prev) ? prev : g.values[0]));
        } catch (e) {
            setGenderMeta(null);
            setGender("");
            setErr(`Meta laden mislukt (${e?.response?.status ?? "no status"})`);
        }
    }

    useEffect(() => {
        // bij type change: herlaad lookups + (optioneel) meta
        load();
        loadMeta();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    async function addItem(e) {
        e.preventDefault();
        setSaving(true);
        setErr("");
        try {
            await api.post(
                "/api/lookups",
                {
                    type,
                    ...(type === "weight_categories" ? { gender } : {}),
                    label,
                    sort_order: Number(sortOrder || 0),
                    active,
                },
                { headers: { Accept: "application/json" } }
            );

            setLabel("");
            setSortOrder("0");
            setActive(true);

            // reset gender terug naar eerste enum waarde (als weight)
            if (type === "weight_categories" && genderMeta?.values?.length) {
                setGender(genderMeta.values[0]);
            }

            await load();
        } catch (e) {
            setErr(e?.response?.data?.message ?? `Opslaan mislukt (${e?.response?.status ?? "no status"})`);
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(item) {
        try {
            await api.put(
                `/api/lookups/${item.id}`,
                {
                    label: item.label,
                    sort_order: item.sort_order,
                    active: !item.active,
                    ...(type === "weight_categories" ? { gender: item.gender } : {}),
                },
                { headers: { Accept: "application/json" } }
            );
            await load();
        } catch (e) {
            setErr(`Update mislukt (${e?.response?.status ?? "no status"})`);
        }
    }

    async function remove(item) {
        const ok = window.confirm(`Verwijder "${item.label}"?`);
        if (!ok) return;

        try {
            await api.delete(`/api/lookups/${item.id}`, { headers: { Accept: "application/json" } });
            await load();
        } catch (e) {
            setErr(`Verwijderen mislukt (${e?.response?.status ?? "no status"})`);
        }
    }

    const rows = useMemo(() => items, [items]);
    const genderLabel = (v) => genderMeta?.labels?.[v] ?? v ?? "-";

    const disableSubmit =
        saving ||
        !label.trim() ||
        (type === "weight_categories" && (!genderMeta || !gender)); // geen meta => geen geldige gender

    return (
        <AppLayout
            title={meta.title}
            subtitle={meta.subtitle}
            actions={
                <Button variant="primary" onClick={() => { load(); if (type === "weight_categories") loadMeta(); }} disabled={loading}>
                    Refresh
                </Button>
            }
        >
            {err && (
                <div className="mb-4">
                    <Alert variant="error">{err}</Alert>
                </div>
            )}

            <form onSubmit={addItem} className="grid sm:grid-cols-4 gap-3 items-end mb-6">
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Waarde</label>
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nieuwe waarde..." />
                </div>

                {type === "weight_categories" && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Geslacht</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            disabled={!genderMeta}
                            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm disabled:bg-slate-100"
                        >
                            {!genderMeta ? (
                                <option value="">(Genders laden...)</option>
                            ) : (
                                genderMeta.values.map((v) => (
                                    <option key={v} value={v}>
                                        {genderLabel(v)}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700">Volgorde</label>
                    <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                </div>

                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                        <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                        />
                        Actief
                    </label>

                    <Button variant="blue" type="submit" disabled={disableSubmit}>
                        {saving ? "Toevoegen..." : "Toevoegen"}
                    </Button>
                </div>
            </form>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                    <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                    <div className="text-slate-900 font-medium">Nog geen items</div>
                    <div className="text-slate-600 text-sm mt-1">Voeg hierboven je eerste waarde toe.</div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-600 border-b">
                                <th className="py-3 pr-4">Waarde</th>
                                {type === "weight_categories" && <th className="py-3 pr-4">Geslacht</th>}
                                <th className="py-3 pr-4">Volgorde</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((it) => (
                                <tr key={it.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                    <td className="py-3 pr-4 font-medium text-slate-900">{it.label}</td>
                                    {type === "weight_categories" && (
                                        <td className="py-3 pr-4 text-slate-700">{genderLabel(it.gender)}</td>
                                    )}
                                    <td className="py-3 pr-4 text-slate-700">{it.sort_order}</td>
                                    <td className="py-3 pr-4">
                                        <Badge tone={it.active ? "ok" : "neutral"}>{it.active ? "Actief" : "Inactief"}</Badge>
                                    </td>
                                    <td className="py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="secondary" type="button" onClick={() => toggleActive(it)}>
                                                {it.active ? "Deactiveer" : "Activeer"}
                                            </Button>
                                            <Button variant="danger" type="button" onClick={() => remove(it)}>
                                                Verwijder
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AppLayout>
    );
}
