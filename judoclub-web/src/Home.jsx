// Home.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button } from "./components/ui";
import { api } from "./api";

function Tile({ title, desc, to, accent = "blue", disabled = false }) {
  const accents = {
    blue: "from-blue-700 to-blue-500",
    emerald: "from-emerald-700 to-emerald-500",
    slate: "from-slate-800 to-slate-600",
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

function MembersSummaryCard({ loading, total, genders }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-600">Leden</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {loading ? "—" : total}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Totaal aantal leden
          </div>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Info
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-600">M</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {loading ? "—" : (genders.M ?? 0)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-600">V</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {loading ? "—" : (genders.V ?? 0)}
          </div>
        </div>
      </div>
    </div>
  );
}


function InfoCard({ title, subtitle, items }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
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
  const all = [];
  let page = 1;
  let lastPage = 1;

  do {
    const res = await api.get("/api/members", {
      params: { ...(q ? { q } : {}), page },
      headers: { Accept: "application/json" },
    });

    all.push(...(res.data?.data ?? []));
    lastPage = res.data?.last_page ?? 1;
    page += 1;

    if (page > 200) break;
  } while (page <= lastPage);

  return all;
}

function topNFromCountMap(counts, n = 12) {
  return Object.entries(counts)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) // ✅ hoog → laag
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

export default function Home() {
  const [dashLoading, setDashLoading] = useState(true);
  const [dashErr, setDashErr] = useState("");
  const [members, setMembers] = useState([]);

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

    const genders = { M: 0, V: 0, onbekend: 0 };
    const belts = {};

    for (const m of members) {
      const g = m.gender === "M" ? "M" : m.gender === "V" ? "V" : "onbekend";
      genders[g] = (genders[g] ?? 0) + 1;

      const b = (m.belt ?? "").trim() || "—";
      belts[b] = (belts[b] ?? 0) + 1;
    }

    return {
      total,
      genders,
      topBelts: topNFromCountMap(belts, 12),
    };
  }, [members]);

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

      {/* 1) Leden-samenvatting + 3) Verdeling gordels (hoog → laag) */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MembersSummaryCard loading={dashLoading} total={stats.total} genders={stats.genders} />
        </div>

        <InfoCard
          title="Verdeling gordels"
          subtitle="Meest voorkomend (hoog → laag)."
          items={dashLoading ? [] : stats.topBelts}
        />
      </div>

      {/* Tegels */}
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-900">Volgende stap</div>
        <div className="mt-1 text-sm text-slate-600">
          Na de UI werken we aan <span className="font-medium text-slate-900">Toernooien + Inschrijvingen</span>.
        </div>
      </div>
    </AppLayout>
  );
}