// Migration procedure: volledige MembersPage.jsx met Export/Import UI

import { useEffect, useRef, useState } from "react";
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

    // Import/Export state
    const fileRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importSummary, setImportSummary] = useState(null); // {inserted, updated, skipped}
    const [importErrors, setImportErrors] = useState([]); // [{row, field, message}]
    const [importMsg, setImportMsg] = useState("");

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

    function onExport() {
        // Download via browser navigation zodat cookies meegaan.
        // (api baseURL? => dit gebruikt huidige origin)
        window.location.href = "/api/members/export";
    }

    function openImportPicker() {
        setImportMsg("");
        setImportSummary(null);
        setImportErrors([]);
        fileRef.current?.click();
    }

    async function onImportFileSelected(e) {
        const file = e.target.files?.[0];
        // reset input zodat je dezelfde file opnieuw kan kiezen
        e.target.value = "";
        if (!file) return;

        setImporting(true);
        setImportMsg("");
        setImportSummary(null);
        setImportErrors([]);

        try {
            const form = new FormData();
            form.append("file", file);

            const res = await api.post("/api/members/import", form, {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "multipart/form-data",
                },
            });

            const data = res?.data ?? {};
            setImportSummary({
                inserted: data.inserted ?? 0,
                updated: data.updated ?? 0,
                skipped: data.skipped ?? 0,
            });
            setImportErrors(Array.isArray(data.errors) ? data.errors : []);
            setImportMsg("Import verwerkt.");

            await load();
        } catch (e2) {
            const status = e2?.response?.status;
            const data = e2?.response?.data;
            const msg = data?.message ?? `Import mislukt (${status ?? "no status"})`;
            setImportMsg(msg);

            // als backend errors terugstuurt in dezelfde vorm
            if (Array.isArray(data?.errors)) setImportErrors(data.errors);
        } finally {
            setImporting(false);
        }
    }

    return (
        <AppLayout
            title="Leden"
            subtitle="Zoek, open en beheer leden."
            actions={
                <>
                    <Button variant="primary" onClick={load} disabled={loading}>
                        {loading ? "Laden..." : "Refresh"}
                    </Button>

                    <Button variant="secondary" onClick={onExport} disabled={loading || importing}>
                        Export Excel
                    </Button>

                    <Button variant="secondary" onClick={openImportPicker} disabled={importing}>
                        {importing ? "Importeren..." : "Import Excel"}
                    </Button>

                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={onImportFileSelected}
                    />

                    <Link to="/members/new">
                        <Button variant="blue">+ Nieuw lid</Button>
                    </Link>
                </>
            }
        >
            {/* Search row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Zoek op voornaam of achternaam..."
                    />
                </div>
                <Button variant="primary" onClick={load} disabled={loading}>
                    Zoeken
                </Button>
                <Link to="/members/new">
                    <Button variant="blue">+ Nieuw lid</Button>
                </Link>
            </div>

            {/* Errors */}
            {err && (
                <div className="mb-4">
                    <Alert variant="error">{err}</Alert>
                </div>
            )}

            {/* Import feedback */}
            {(importMsg || importSummary || importErrors.length > 0) && (
                <div className="mb-4 space-y-2">
                    {importMsg && <Alert variant={importErrors.length ? "error" : "ok"}>{importMsg}</Alert>}

                    {importSummary && (
                        <div className="text-sm text-slate-700">
                            Resultaat:{" "}
                            <span className="font-medium text-slate-900">
                                {importSummary.inserted} nieuw
                            </span>
                            ,{" "}
                            <span className="font-medium text-slate-900">
                                {importSummary.updated} aangepast
                            </span>
                            ,{" "}
                            <span className="font-medium text-slate-900">
                                {importSummary.skipped} overgeslagen
                            </span>
                            .
                        </div>
                    )}

                    {importErrors.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="text-sm font-medium text-slate-900 mb-2">
                                Import fouten (toon eerste {Math.min(importErrors.length, 20)}):
                            </div>
                            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                                {importErrors.slice(0, 20).map((er, idx) => (
                                    <li key={idx}>
                                        Rij {er.row ?? "?"} — {er.field ?? "?"}: {er.message ?? "Onbekende fout"}
                                    </li>
                                ))}
                            </ul>
                            {importErrors.length > 20 && (
                                <div className="mt-2 text-xs text-slate-500">
                                    Er zijn meer fouten dan getoond. Pas je Excel aan en importeer opnieuw.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Table / Empty / Loading */}
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
                                <th className="py-3 pr-4">Licentienummer</th>
                                <th className="py-3 pr-4">Geslacht</th>
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
                                    <td className="py-3 pr-4 text-slate-700">{m.license_number ?? "_"}</td>
                                    <td className="py-3 pr-4 text-slate-700">{m.gender ?? "_"}</td>
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

                    <div className="mt-4 text-xs text-slate-500">Tip: klik op een naam om te bewerken.</div>
                </div>
            )}
        </AppLayout>
    );
}
