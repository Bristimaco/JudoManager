// Home.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button } from "./components/ui";
import { api } from "./api";

function Tile({ title, desc, to, accent = "blue", disabled = false }) {
  const accents = {
    blue: "from-blue-700 to-blue-500",
    emerald: "from-emerald-700 to-emerald-500",
    slate: "from-slate-800 to-slate-600",
    rose: "from-rose-700 to-rose-500",
  };

  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-70">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{desc}</div>
        <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Binnenkort
        </div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
    >
      <div className={"h-10 w-10 rounded-xl grid place-items-center text-white bg-gradient-to-r " + (accents[accent] ?? accents.blue)}>
        <span className="font-bold">{title[0]}</span>
      </div>
      <div className="mt-4">
        <div className="text-base font-semibold text-slate-900 group-hover:underline">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{desc}</div>
      </div>
      <div className="mt-5 text-sm font-medium text-slate-900">Open →</div>
    </Link>
  );
}

function StatCard({ title, value, sub, tone = "neutral" }) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-600">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
          {sub ? <div className="mt-1 text-sm text-slate-600">{sub}</div> : null}
        </div>
        <div className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold " + (tones[tone] ?? tones.neutral)}>
          {tone === "ok" ? "OK" : tone === "warn" ? "Let op" : tone === "danger" ? "Actie" : "Info"}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, subtitle, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
      </div>

      {items?.length ? (
        <div className="mt-4 space-y-2">
          {items.map((it) => (
            <div key={it.label} className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-700">{it.label}</div>
              <Badge tone="neutral">{it.value}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-600">Nog geen data.</div>
      )}
    </div>
  );
}

async function fetchAllMembers({ q = "" } = {}) {
  // Werkt met jouw bestaande paginate(20) endpoint.
  // Voor clubs blijft dit meestal beperkt en snel genoeg.
  const all = [];
  let page = 1;
  let lastPage = 1;

  do {
    const res = await api.get("/api/members", {
      params: { ...(q ? { q } : {}), page },
      headers: { Accept: "application/json" },
    });

    const data = res.data?.data ?? [];
    all.push(...data);

    lastPage = res.data?.last_page ?? 1;
    page += 1;

    // safety
    if (page > 200) break;
  } while (page <= lastPage);

  return all;
}

function topNFromCountMap(counts, n = 5) {
  return Object.entries(counts)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

export default function Home() {
  const importInputRef = useRef(null);

  const [dashLoading, setDashLoading] = useState(true);
  const [dashErr, setDashErr] = useState("");
  const [members, setMembers] = useState([]);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importErrors, setImportErrors] = useState([]);

  async function loadDashboard() {
    setDashLoading(true);
    setDashErr("");
    try {
      const all = await fetchAllMembers();
      setMembers(all);
    } catch (e) {
      setDashErr(`Dashboard laden mislukt (${e?.response?.status ?? "no status"})`);
    } finally {
      setDashLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => !!m.active).length;
    const inactive = total - active;

    const genders = { M: 0, V: 0, onbekend: 0 };
    const belts = {};
    const ages = {};

    for (const m of members) {
      const g = m.gender === "M" ? "M" : m.gender === "V" ? "V" : "onbekend";
      genders[g] = (genders[g] ?? 0) + 1;

      const b = (m.belt ?? "").trim() || "—";
      belts[b] = (belts[b] ?? 0) + 1;

      const a = (m.age_category ?? "").trim() || "—";
      ages[a] = (ages[a] ?? 0) + 1;
    }

    return {
      total,
      active,
      inactive,
      genders,
      topBelts: topNFromCountMap(belts, 6),
      topAges: topNFromCountMap(ages, 6),
    };
  }, [members]);

  function onExport() {
    // download
    window.location.href = "/api/members/export";
  }

  function openImportPicker() {
    setImportMsg("");
    setImportErrors([]);
    importInputRef.current?.click();
  }

  async function onPickImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg("");
    setImportErrors([]);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/api/members/import", form, {
        headers: { "Content-Type": "multipart/form-data", Accept: "application/json" },
      });

      const inserted = res?.data?.inserted ?? 0;
      const updated = res?.data?.updated ?? 0;
      const skipped = res?.data?.skipped ?? 0;

      setImportMsg(`Import verwerkt. Resultaat: ${inserted} nieuw, ${updated} aangepast, ${skipped} overgeslagen.`);
      setImportErrors(res?.data?.errors ?? []);

      await loadDashboard();
    } catch (err) {
      setImportMsg(`Import mislukt (${err?.response?.status ?? "no status"})`);
      setImportErrors(err?.response?.data?.errors ?? []);
    } finally {
      setImporting(false);
      // allow same file re-pick
      e.target.value = "";
    }
  }

  const genderSub = `M: ${stats.genders.M ?? 0} • V: ${stats.genders.V ?? 0} • ?: ${stats.genders.onbekend ?? 0}`;

  return (
    <AppLayout
      title="Overzicht"
      subtitle="Beheer leden en straks ook toernooien & inschrijvingen."
      actions={
        <>
          <Button variant="primary" onClick={loadDashboard} disabled={dashLoading}>
            {dashLoading ? "Laden..." : "Refresh"}
          </Button>
          <Link to="/members/new">
            <Button variant="blue">+ Nieuw lid</Button>
          </Link>
        </>
      }
    >
      {dashErr && (
        <div className="mb-4">
          <Alert variant="error">{dashErr}</Alert>
        </div>
      )}

      {/* 2) Statistieken */}
      <div className="grid lg:grid-cols-3 gap-4">
        <StatCard title="Totaal leden" value={dashLoading ? "—" : stats.total} sub="Alle leden in de database." tone="info" />
        <StatCard title="Actieve leden" value={dashLoading ? "—" : stats.active} sub={`Inactief: ${dashLoading ? "—" : stats.inactive}`} tone="ok" />
        <StatCard title="Geslacht" value={dashLoading ? "—" : (stats.genders.M ?? 0) + (stats.genders.V ?? 0)} sub={genderSub} tone="neutral" />
      </div>

      {/* 3) Quick actions */}
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Snelle acties</div>
          <div className="mt-1 text-sm text-slate-600">Importeer of exporteer de ledenlijst.</div>

          <div className="mt-4 flex flex-col gap-2">
            <Button variant="primary" type="button" onClick={onExport}>
              Export naar Excel
            </Button>
            <Button variant="secondary" type="button" onClick={openImportPicker} disabled={importing}>
              {importing ? "Importeren..." : "Importeer Excel"}
            </Button>

            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onPickImportFile}
            />
          </div>
        </div>

        <Tile
          title="Leden"
          desc="Zoek leden, voeg nieuwe leden toe en beheer profielen."
          to="/members"
          accent="blue"
        />

        <Tile
          title="Admin"
          desc="Beheer lookups (gordels, leeftijd- & gewichtscategorieën)."
          to="/admin"
          accent="slate"
        />

        <Tile
          title="Toernooien"
          desc="Maak toernooien aan en schrijf leden in (komt straks)."
          to="/tournaments"
          accent="emerald"
          disabled
        />
      </div>

      {/* Import feedback */}
      {(importMsg || (importErrors?.length ?? 0) > 0) && (
        <div className="mt-4">
          <Alert variant={importMsg.includes("mislukt") ? "error" : "success"}>
            <div className="font-medium">{importMsg || "Import resultaat"}</div>
            {!!importErrors?.length && (
              <div className="mt-2 text-sm">
                <div className="font-medium">Import fouten (toon eerste 6):</div>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {importErrors.slice(0, 6).map((e, idx) => (
                    <li key={idx}>
                      Rij {e.row} — {e.field}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Alert>
        </div>
      )}

      {/* 4) Info cards in tegelvorm */}
      <div className="mt-4 grid lg:grid-cols-3 gap-4">
        <InfoCard
          title="Verdeling gordels"
          subtitle="Top (meest voorkomend)."
          items={dashLoading ? [] : stats.topBelts}
        />
        <InfoCard
          title="Leeftijdscategorieën"
          subtitle="Top (meest voorkomend)."
          items={dashLoading ? [] : stats.topAges}
        />
        <InfoCard
          title="Datakwaliteit"
          subtitle="Snelle checks op ontbrekende velden."
          items={
            dashLoading
              ? []
              : [
                { label: "Zonder geslacht", value: stats.genders.onbekend ?? 0 },
                { label: "Zonder leeftijdscategorie", value: members.filter((m) => !m.age_category).length },
                { label: "Zonder gewichtscategorie", value: members.filter((m) => !m.weight_category).length },
              ]
          }
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-900">Volgende stap</div>
        <div className="mt-1 text-sm text-slate-600">
          Na de UI werken we aan <span className="font-medium text-slate-900">Toernooien + Inschrijvingen</span>.
        </div>
      </div>
    </AppLayout>
  );
}


