import { useEffect, useState } from "react";
import { api } from "./api";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Alert, Badge, Button, Input, Select } from "./components/ui";
import { formatDateBE } from "./utils/date";
import DatePickerInput from "./components/DatePickerInput";

export default function MemberDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState(""); // ISO yyyy-mm-dd of ""
  const [belt, setBelt] = useState("");
  const [active, setActive] = useState(true);
  const [interestedInCompetition, setInterestedInCompetition] = useState(true);
  const [photo, setPhoto] = useState(null); // Base64 photo

  const [belts, setBelts] = useState([]);
  const [beltsLoading, setBeltsLoading] = useState(true);

  // Belt colors voor mapping belt naam -> kleur (consistent met andere components)
  const [beltColors, setBeltColors] = useState({});

  // Belt color definitions (consistent met LookupListPage)
  const beltColorDefinitions = [
    { name: 'wit', hex: '#FFFFFF', border: true },
    { name: 'geel', hex: '#FFD700' },
    { name: 'oranje', hex: '#FF8C00' },
    { name: 'groen', hex: '#228B22' },
    { name: 'blauw', hex: '#0000FF' },
    { name: 'bruin', hex: '#8B4513' },
    { name: 'zwart', hex: '#000000' }
  ];

  // Helper functie voor belt color data
  const getBeltColorData = (beltName) => {
    if (!beltName) return null;
    const colorName = beltColors[beltName];
    return beltColorDefinitions.find(c => c.name === colorName);
  };

  const [ageCategory, setAgeCategory] = useState("");
  const [ageCategories, setAgeCategories] = useState([]);
  const [ageLoading, setAgeLoading] = useState(true);

  const [weightCategory, setWeightCategory] = useState("");
  const [weightCategories, setWeightCategories] = useState([]);
  const [weightLoading, setWeightLoading] = useState(true);

  const [genderMeta, setGenderMeta] = useState(null); // { values: [...], labels: {...} }
  const [genderMetaLoading, setGenderMetaLoading] = useState(true);

  // ✅ helper: ondersteunt zowel array response als paginator {data, meta, links}
  function pluckData(res) {
    if (!res) return [];
    const d = res.data;
    return Array.isArray(d) ? d : (d?.data ?? []);
  }

  async function loadMeta() {
    setGenderMetaLoading(true);
    try {
      const res = await api.get("/api/meta", { headers: { Accept: "application/json" } });
      setGenderMeta(res?.data?.genders ?? null);
    } catch (e) {
      setGenderMeta(null);
      // niet hard-failen, maar wel info geven
      setError((prev) => prev || `Meta laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setGenderMetaLoading(false);
    }
  }

  async function loadWeightCategories(currentGender, currentAgeCategory) {
    if (!currentGender) {
      setWeightCategories([]);
      setWeightLoading(false);
      return;
    }

    setWeightLoading(true);
    try {
      const params = { type: "weight_categories", gender: currentGender, per_page: 200, page: 1 };
      if (currentAgeCategory) {
        params.age_category = currentAgeCategory;
      }
      const res = await api.get("/api/lookups", {
        params,
        headers: { Accept: "application/json" },
      });

      const data = pluckData(res);
      setWeightCategories(data.filter((x) => x.active));
    } catch (e) {
      setWeightCategories([]);
      setError((prev) => prev || `Gewichtscategorieën laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setWeightLoading(false);
    }
  }

  async function loadAgeCategories() {
    setAgeLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "age_categories", per_page: 200, page: 1 },
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

  async function loadBelts() {
    setBeltsLoading(true);
    try {
      const res = await api.get("/api/lookups", {
        params: { type: "belts", per_page: 200, page: 1 },
        headers: { Accept: "application/json" },
      });

      const data = pluckData(res);
      const activeBelts = data.filter((x) => x.active);
      setBelts(activeBelts);

      // Load belt colors mapping
      const colorMap = {};
      activeBelts.forEach(belt => {
        if (belt.color) {
          colorMap[belt.label] = belt.color;
        }
      });
      setBeltColors(colorMap);
    } catch (e) {
      setBelts([]);
      setBeltColors({});
      setError((prev) => prev || `Gordels laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setBeltsLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/members/${id}`, { headers: { Accept: "application/json" } });
      const m = res.data;

      setFirstName(m.first_name ?? "");
      setLastName(m.last_name ?? "");
      setEmail(m.email ?? "");
      setLicenseNumber(m.license_number ?? "");
      setGender(m.gender ?? "");
      setBirthdate(m.birthdate ? String(m.birthdate).split("T")[0] : "");
      setBelt(m.belt ?? "");
      setActive(!!m.active);
      setInterestedInCompetition(!!m.interested_in_competition);
      setAgeCategory(m.age_category ?? "");
      setWeightCategory(m.weight_category ?? "");
      setPhoto(m.photo ?? null);

      // ✅ dit kan nu niet meer crashen door paginated lookups
      await loadWeightCategories(m.gender ?? "", m.age_category ?? "");
    } catch (e) {
      console.error("MEMBER LOAD ERROR", e);
      setError(`Laden mislukt (${e?.response?.status ?? e?.message ?? "no status"})`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
    load();
    loadBelts();
    loadAgeCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (loading) return;
    setWeightCategory("");
    loadWeightCategories(gender, ageCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, ageCategory]);

  function fe(name) {
    const msgs = fieldErrors?.[name];
    if (!msgs?.length) return null;
    return <div className="mt-1 text-sm text-red-600">{msgs[0]}</div>;
  }

  const genderLabel = (v) => genderMeta?.labels?.[v] ?? v;

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});

    try {
      await api.put(
        `/api/members/${id}`,
        {
          license_number: licenseNumber,
          first_name: firstName,
          last_name: lastName,
          email: email,
          birthdate: birthdate || null,
          belt: belt || null,
          active,
          interested_in_competition: interestedInCompetition,
          age_category: ageCategory || null,
          gender: gender || null,
          weight_category: gender ? weightCategory || null : null,
        },
        { headers: { Accept: "application/json" } }
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
    const ok = window.confirm("Ben je zeker dat je dit lid wil verwijderen?");
    if (!ok) return;

    setDeleting(true);
    setError("");

    try {
      await api.delete(`/api/members/${id}`, { headers: { Accept: "application/json" } });
      nav("/members");
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      // Specifieke handling voor actieve leden
      if (status === 422 && data?.error === 'active_member_cannot_be_deleted') {
        setError(data.message || "Dit lid is nog actief. Zet het lid eerst op inactief voordat je het verwijdert.");
      } else {
        setError(`Verwijderen mislukt (${status ?? e?.message ?? "no status"})`);
      }
      setDeleting(false);
    }
  }

  async function onUploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await api.post(
        `/api/members/${id}/photo`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setPhoto(res.data.photo);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      if (status === 422 && data?.errors) {
        setFieldErrors(data.errors);
        setError("Controleer de foto.");
      } else {
        setError(`Foto uploaden mislukt (${status ?? e?.message ?? "no status"})`);
      }
    } finally {
      setUploadingPhoto(false);
      e.target.value = ""; // Reset file input
    }
  }

  async function onDeletePhoto() {
    const ok = window.confirm("Ben je zeker dat je deze foto wil verwijderen?");
    if (!ok) return;

    setDeletingPhoto(true);
    setError("");

    try {
      await api.delete(`/api/members/${id}/photo`, { headers: { Accept: "application/json" } });
      setPhoto(null);
    } catch (e) {
      const status = e?.response?.status;
      setError(`Foto verwijderen mislukt (${status ?? e?.message ?? "no status"})`);
    } finally {
      setDeletingPhoto(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Lid laden..." subtitle="Gegevens laden...">
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
  const memberName = [firstName, lastName].filter(Boolean).join(' ') || `Lid #${id}`;

  return (
    <AppLayout
      title={memberName}
      subtitle="Bewerk gegevens en beheer status."
      actions={
        <>
          <Link to="/members">
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

      <form onSubmit={onSave} className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Voornaam</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            {fe("first_name")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Achternaam</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            {fe("last_name")}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">E-mailadres</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bijvoorbeeld: jan.janssen@email.com"
          />
          {fe("email")}
        </div>

        {/* Geboortedatum + Leeftijdscategorie (2 kolommen) */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Geboortedatum</label>
            <DatePickerInput
              value={birthdate || null}
              onChange={(iso) => setBirthdate(iso ?? "")}
              placeholder="Kies geboortedatum..."
            />
            {birthdate && <div className="mt-1 text-xs text-slate-500">Weergave: {formatDateBE(birthdate)}</div>}
            {fe("birthdate")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Leeftijdscategorie</label>
            <Select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} disabled={ageLoading}>
              <option value="">-- Kies leeftijdscategorie --</option>
              {ageCategories.map((cat) => (
                <option key={cat.id} value={cat.label}>
                  {cat.label}
                </option>
              ))}
            </Select>
            {fe("age_category")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Geslacht</label>
            <Select value={gender} onChange={(e) => setGender(e.target.value)} disabled={genderMetaLoading}>
              <option value="">-- Kies geslacht --</option>
              {genderMeta?.values?.map((g) => (
                <option key={g} value={g}>
                  {genderLabel(g)}
                </option>
              ))}
            </Select>
            {fe("gender")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Gewichtscategorie</label>
            <Select
              value={weightCategory}
              onChange={(e) => setWeightCategory(e.target.value)}
              disabled={!gender || weightLoading}
            >
              <option value="">-- {!gender ? "Kies eerst geslacht" : "Kies gewichtscategorie"} --</option>
              {weightCategories.map((cat) => (
                <option key={cat.id} value={cat.label}>
                  {cat.label}
                </option>
              ))}
            </Select>
            {fe("weight_category")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Gordel</label>
            {beltsLoading ? (
              <div className="text-sm text-slate-500">Gordels laden...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBelt("")}
                    className={`px-3 py-2 text-sm rounded-lg border-2 hover:shadow-sm transition-shadow ${belt === "" ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
                      }`}
                  >
                    Geen gordel
                  </button>
                  {belts.map((beltItem) => {
                    const colorData = getBeltColorData(beltItem.label);
                    return (
                      <button
                        key={beltItem.id}
                        type="button"
                        onClick={() => setBelt(beltItem.label)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border-2 hover:shadow-sm transition-shadow ${belt === beltItem.label ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
                          }`}
                      >
                        {colorData && (
                          <div
                            className={`w-5 h-5 rounded border-2 border-gray-300 ${colorData.border ? "shadow-inner" : ""
                              }`}
                            style={{ backgroundColor: colorData.hex }}
                          />
                        )}
                        <span>{beltItem.label}</span>
                      </button>
                    );
                  })}
                </div>
                {belt && (
                  <div className="text-sm text-slate-600">
                    Gekozen: <strong>{belt}</strong>
                  </div>
                )}
              </div>
            )}
            {fe("belt")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Licentienummer</label>
            <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            {fe("license_number")}
          </div>
        </div>

        {/* Foto Upload Section */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">Foto</label>
            {photo && (
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={onDeletePhoto}
                disabled={deletingPhoto}
              >
                {deletingPhoto ? "Verwijderen..." : "Verwijder foto"}
              </Button>
            )}
          </div>

          {photo ? (
            <div className="mb-4">
              <img
                src={photo}
                alt={memberName}
                className="w-32 h-32 object-cover rounded-lg border border-slate-300"
              />
            </div>
          ) : (
            <div className="mb-4 w-32 h-32 bg-slate-200 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 text-xs text-center">
              Geen foto
            </div>
          )}

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={onUploadPhoto}
              disabled={uploadingPhoto}
              className="block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-2">Max 10MB, JPG/PNG/WebP</p>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 select-none">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <span className="text-sm text-slate-700">Actief lid</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 select-none">
            <input
              type="checkbox"
              checked={interestedInCompetition}
              onChange={(e) => setInterestedInCompetition(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <span className="text-sm text-slate-700">Interesse in competitie</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>

          <Button
            variant="danger"
            type="button"
            onClick={onDelete}
            disabled={deleting || active}
            className="sm:ml-auto"
            title={active ? "Zet het lid eerst op inactief om het te kunnen verwijderen" : "Verwijder dit lid"}
          >
            {deleting ? "Verwijderen..." : active ? "Verwijderen (eerst inactief maken)" : "Verwijder"}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
