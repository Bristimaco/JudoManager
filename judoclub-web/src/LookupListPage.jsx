import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Button, Input, Badge } from "./components/ui";
import { api } from "./api";
import Pagination from "./components/Pagination";

const titles = {
    belts: { title: "Gordels", subtitle: "Beheer gordels." },
    age_categories: { title: "Leeftijdscategorieën", subtitle: "Beheer leeftijdsgroepen." },
    weight_categories: { title: "Gewichtscategorieën", subtitle: "Beheer gewichtsklassen." },
};

export default function LookupListPage() {
    const { type } = useParams();
    const pageMeta = titles[type] ?? { title: "Instellingen", subtitle: "" };

    const [items, setItems] = useState([]);
    const [label, setLabel] = useState("");
    const [gender, setGender] = useState(""); // geen default hardcoded
    const [sortOrder, setSortOrder] = useState("0");
    const [minAge, setMinAge] = useState(""); // voor age categories
    const [color, setColor] = useState(""); // voor belts
    const [active, setActive] = useState(true);

    const [genderMeta, setGenderMeta] = useState(null); // { values: [...], labels: {...} }

    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    // Available belt colors with hex values
    const beltColors = [
        { name: 'wit', hex: '#FFFFFF', border: true },
        { name: 'geel', hex: '#FFD700' },
        { name: 'oranje', hex: '#FF8C00' },
        { name: 'groen', hex: '#228B22' },
        { name: 'blauw', hex: '#0000FF' },
        { name: 'bruin', hex: '#8B4513' },
        { name: 'zwart', hex: '#000000' }
    ];

    // Find color object by name
    const getColorByName = (colorName) => beltColors.find(c => c.name === colorName);

    // For inline editing
    const [editingId, setEditingId] = useState(null);

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await api.get("/api/lookups", {
                params: { type, page },
                headers: { Accept: "application/json" },
            });

            // ✅ ondersteunt beide shapes:
            // - non-paginated: res.data is array
            // - paginated: res.data is object met data/meta/links
            const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
            setItems(data);

            const m = res.data?.meta ?? res.data;
            if (m && typeof m === "object" && "current_page" in m) {
                setMeta({
                    current_page: Number(m.current_page ?? page),
                    last_page: Number(m.last_page ?? 1),
                    per_page: Number(m.per_page ?? 20),
                    total: Number(m.total ?? data.length),
                });
            } else {
                setMeta(null);
            }
        } catch (e) {
            console.error("LOOKUPS ERROR", e);
            setErr(`Laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
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
            setErr(`Meta laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        }
    }

    // Bij type change: reset naar pagina 1 + reload meta
    useEffect(() => {
        setPage(1);
        loadMeta();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    // Laad telkens page of type verandert
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, type]);

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
                    ...(type === "age_categories" && minAge ? { min_age: Number(minAge) } : {}),
                    ...(type === "belts" && color ? { color } : {}),
                    label,
                    sort_order: Number(sortOrder || 0),
                    active,
                },
                { headers: { Accept: "application/json" } }
            );

            setLabel("");
            setSortOrder("0");
            setMinAge("");
            setColor("");
            setActive(true);

            // reset gender terug naar eerste enum waarde (als weight)
            if (type === "weight_categories" && genderMeta?.values?.length) {
                setGender(genderMeta.values[0]);
            }

            // Na toevoegen: blijf op huidige pagina en herlaad
            await load();
        } catch (e) {
            setErr(e?.response?.data?.message ?? `Opslaan mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
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
                    ...(item.min_age !== undefined && item.min_age !== null ? { min_age: item.min_age } : {}),
                    ...(item.color ? { color: item.color } : {}),
                    active: !item.active,
                    ...(type === "weight_categories" ? { gender: item.gender } : {}),
                },
                { headers: { Accept: "application/json" } }
            );
            await load();
        } catch (e) {
            setErr(`Update mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        }
    }

    async function updateMinAge(item, newMinAge) {
        try {
            await api.put(
                `/api/lookups/${item.id}`,
                {
                    label: item.label,
                    sort_order: item.sort_order,
                    min_age: newMinAge ? Number(newMinAge) : null,
                    ...(item.color ? { color: item.color } : {}),
                    active: item.active,
                    ...(type === "weight_categories" ? { gender: item.gender } : {}),
                },
                { headers: { Accept: "application/json" } }
            );
            setEditingId(null);
            await load();
        } catch (e) {
            setErr(`Update mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        }
    }

    async function updateColor(item, newColor) {
        try {
            await api.put(
                `/api/lookups/${item.id}`,
                {
                    label: item.label,
                    sort_order: item.sort_order,
                    ...(item.min_age !== undefined && item.min_age !== null ? { min_age: item.min_age } : {}),
                    color: newColor || null,
                    active: item.active,
                    ...(type === "weight_categories" ? { gender: item.gender } : {}),
                },
                { headers: { Accept: "application/json" } }
            );
            setEditingId(null);
            await load();
        } catch (e) {
            setErr(`Update mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
        }
    }

    async function remove(item) {
        const ok = window.confirm(`Verwijder "${item.label}"?`);
        if (!ok) return;

        try {
            await api.delete(`/api/lookups/${item.id}`, { headers: { Accept: "application/json" } });
            await load();
        } catch (e) {
            setErr(`Verwijderen mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
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
            title={pageMeta.title}
            subtitle={pageMeta.subtitle}
            actions={
                <Button
                    variant="primary"
                    onClick={() => {
                        load();
                        if (type === "weight_categories") loadMeta();
                    }}
                    disabled={loading}
                >
                    Refresh
                </Button>
            }
        >
            {err && (
                <div className="mb-4">
                    <Alert variant="error">{err}</Alert>
                </div>
            )}

            <form onSubmit={addItem} className="grid gap-3 items-end mb-6" style={{ gridTemplateColumns: `repeat(${type === 'weight_categories' ? '5' : type === 'age_categories' ? '4' : type === 'belts' ? '4' : '3'}, 1fr) auto` }}>
                <div>
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

                {type === "age_categories" && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Min. Leeftijd</label>
                        <Input
                            type="number"
                            value={minAge}
                            onChange={(e) => setMinAge(e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                        />
                    </div>
                )}

                {type === "belts" && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Kleur</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <button
                                type="button"
                                onClick={() => setColor("")}
                                className={`w-8 h-8 rounded-lg border-2 bg-gray-100 flex items-center justify-center text-xs text-gray-600 hover:shadow-sm transition-shadow ${color === "" ? "border-blue-500" : "border-gray-300"
                                    }`}
                                title="Geen kleur"
                            >
                                —
                            </button>
                            {beltColors.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setColor(c.name)}
                                    className={`w-8 h-8 rounded-lg border-2 hover:shadow-sm transition-shadow ${color === c.name ? "border-blue-500 border-4" : "border-gray-300"
                                        } ${c.border ? "shadow-inner" : ""}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                                />
                            ))}
                        </div>
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
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-600 border-b">
                                    <th className="py-3 pr-4">Waarde</th>
                                    {type === "weight_categories" && <th className="py-3 pr-4">Geslacht</th>}
                                    {type === "age_categories" && <th className="py-3 pr-4">Min. Leeftijd</th>}
                                    {type === "belts" && <th className="py-3 pr-4">Kleur</th>}
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
                                        {type === "age_categories" && (
                                            <td className="py-3 pr-4 text-slate-700">
                                                {editingId === it.id ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={it.min_age ?? ""}
                                                        min="0"
                                                        max="100"
                                                        className="w-16 px-2 py-1 text-sm border border-slate-300 rounded"
                                                        autoFocus
                                                        onBlur={(e) => {
                                                            const newValue = e.target.value;
                                                            if (newValue !== String(it.min_age ?? "")) {
                                                                updateMinAge(it, newValue);
                                                            } else {
                                                                setEditingId(null);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.target.blur();
                                                            } else if (e.key === "Escape") {
                                                                setEditingId(null);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <span
                                                        className="cursor-pointer hover:bg-slate-100 px-1 py-1 rounded"
                                                        onClick={() => setEditingId(it.id)}
                                                        title="Klik om te bewerken"
                                                    >
                                                        {it.min_age ?? "-"}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {type === "belts" && (
                                            <td className="py-3 pr-4">
                                                {editingId === it.id ? (
                                                    <div className="flex flex-wrap gap-1 bg-white border border-slate-300 rounded-lg p-2 shadow-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                updateColor(it, "");
                                                            }}
                                                            className={`w-6 h-6 rounded border-2 bg-gray-100 flex items-center justify-center text-xs text-gray-600 hover:shadow-sm transition-shadow ${(it.color ?? "") === "" ? "border-blue-500" : "border-gray-300"
                                                                }`}
                                                            title="Geen kleur"
                                                        >
                                                            —
                                                        </button>
                                                        {beltColors.map((c) => (
                                                            <button
                                                                key={c.name}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateColor(it, c.name);
                                                                }}
                                                                className={`w-6 h-6 rounded border-2 hover:shadow-sm transition-shadow ${it.color === c.name ? "border-blue-500 border-3" : "border-gray-300"
                                                                    } ${c.border ? "shadow-inner" : ""}`}
                                                                style={{ backgroundColor: c.hex }}
                                                                title={c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                                                            />
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingId(null)}
                                                            className="ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="cursor-pointer hover:bg-slate-100 px-1 py-1 rounded flex items-center gap-2"
                                                        onClick={() => setEditingId(it.id)}
                                                        title="Klik om te bewerken"
                                                    >
                                                        {it.color ? (
                                                            <div
                                                                className={`w-6 h-6 rounded border-2 border-gray-300 ${getColorByName(it.color)?.border ? 'shadow-inner' : ''}`}
                                                                style={{ backgroundColor: getColorByName(it.color)?.hex || '#CCCCCC' }}
                                                                title={it.color.charAt(0).toUpperCase() + it.color.slice(1)}
                                                            />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded border-2 border-gray-300 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                                —
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
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

                    {/* ✅ pagination onderaan (alleen als meta bestaat) */}
                    {meta && <Pagination meta={meta} onPage={setPage} />}
                </>
            )}
        </AppLayout>
    );
}
