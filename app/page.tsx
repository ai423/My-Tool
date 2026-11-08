"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toolConfig } from "@/tool.config";
import ArticleWriter from "./ArticleWriter";
import { emptyProfile, type BrandProfile, type Company } from "@/lib/company";

type Draft = {
  id?: string;
  name: string;
  website: string;
  linkedin: string;
  notes: string;
  profile: BrandProfile | null;
};

const blank: Draft = { name: "", website: "", linkedin: "", notes: "", profile: null };
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function Home() {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [writing, setWriting] = useState<Company | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 4000);
  };

  const load = useCallback(async () => {
    setLoadError("");
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setLoadError("לא הצלחתי לטעון את החברות. רעננו את הדף ונסו שוב.");
    else setCompanies(data as Company[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function check(field: "name" | "website") {
    if (!draft) return;
    const v = draft[field].trim();
    setErrors((e) => ({
      ...e,
      [field]: v ? "" : field === "name" ? "צריך שם חברה" : "צריך כתובת אתר, למשל example.co.il",
    }));
  }

  async function analyze() {
    if (!draft) return;
    check("website");
    if (!draft.website.trim()) return;
    setAnalyzing(true);
    setFormError("");
    try {
      const r = await fetch("/api/company/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ website: draft.website, linkedin: draft.linkedin, notes: draft.notes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDraft({ ...draft, profile: j.profile });
      say("האתר נקרא. עברו על הפרופיל ושמרו.");
    } catch (e) {
      setFormError(e instanceof Error && e.message ? e.message : "לא הצלחתי לקרוא את האתר. נסו שוב.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim() || !draft.website.trim()) {
      check("name");
      check("website");
      return;
    }
    setSaving(true);
    setFormError("");
    const row = {
      name: draft.name.trim(),
      website: draft.website.trim(),
      linkedin: draft.linkedin.trim() || null,
      notes: draft.notes.trim() || null,
      profile: draft.profile,
      updated_at: new Date().toISOString(),
    };
    const { error } = draft.id
      ? await supabase.from("companies").update(row).eq("id", draft.id)
      : await supabase.from("companies").insert(row);
    setSaving(false);
    if (error) {
      setFormError("לא הצלחתי לשמור. נסו שוב.");
      return;
    }
    setDraft(null);
    say("נשמר");
    load();
  }

  async function remove() {
    if (!draft?.id) return;
    const { error } = await supabase.from("companies").delete().eq("id", draft.id);
    if (error) {
      setFormError("לא הצלחתי למחוק. נסו שוב.");
      return;
    }
    setDraft(null);
    say("החברה נמחקה");
    load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const p = draft?.profile;
  const setProfile = (patch: Partial<BrandProfile>) =>
    draft && setDraft({ ...draft, profile: { ...(draft.profile ?? emptyProfile), ...patch } });

  return (
    <main className="container">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.25rem)", fontWeight: 700 }}>
          {toolConfig.toolName}
        </h1>
        <button className="btn secondary" onClick={signOut}>יציאה</button>
      </header>

      {writing && <ArticleWriter company={writing} onBack={() => setWriting(null)} />}

      {!draft && !writing && (
        <>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "1.25rem" }}>החברות שלכם</h2>
            {companies && companies.length > 0 && (
              <button className="btn" onClick={() => setDraft({ ...blank })}>הוספת חברה</button>
            )}
          </div>

          {loadError && (
            <div className="card">
              <span className="status bad" role="alert">{loadError}</span>
              <button className="btn secondary" onClick={load}>טעינה מחדש</button>
            </div>
          )}

          {!loadError && companies === null && (
            <div className="stack" aria-busy="true">
              <div className="skeleton" style={{ height: 72 }} />
              <div className="skeleton" style={{ height: 72 }} />
            </div>
          )}

          {companies && companies.length === 0 && (
            <div className="card empty">
              <p>עוד אין חברות. הוסיפו חברה ראשונה, והכלי ילמד את המותג שלה מהאתר.</p>
              <button className="btn" onClick={() => setDraft({ ...blank })}>הוספת חברה</button>
            </div>
          )}

          {companies && companies.length > 0 && (
            <div className="stack">
              {companies.map((c) => (
                <div key={c.id} className="card">
                  <button
                    style={{ textAlign: "start", cursor: "pointer", font: "inherit", color: "inherit", background: "none", border: 0, padding: 0, display: "grid", gap: 8 }}
                    onClick={() =>
                      setDraft({
                        id: c.id,
                        name: c.name,
                        website: c.website,
                        linkedin: c.linkedin ?? "",
                        notes: c.notes ?? "",
                        profile: c.profile,
                      })
                    }
                  >
                    <span className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{c.name}</strong>
                      <span className={`status ${c.profile ? "ok" : "warn"}`}>
                        {c.profile ? "פרופיל מוכן" : "אין פרופיל"}
                      </span>
                    </span>
                    <small dir="ltr" style={{ textAlign: "start" }}>{c.website}</small>
                  </button>
                  <div className="row">
                    <button className="btn secondary" onClick={() => setWriting(c)}>
                      כתיבת מאמר
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {draft && !writing && (
        <>
          <h2 style={{ fontSize: "1.25rem" }}>{draft.id ? "עריכת חברה" : "חברה חדשה"}</h2>

          <section className="card">
            <div className="field">
              <label htmlFor="name">שם החברה</label>
              <input id="name" value={draft.name} onBlur={() => check("name")}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="website">כתובת האתר</label>
              <input id="website" dir="ltr" inputMode="url" value={draft.website}
                onBlur={() => check("website")}
                onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
              {errors.website && <span className="error">{errors.website}</span>}
            </div>
            <div className="field">
              <label htmlFor="linkedin">קישור ללינקדאין</label>
              <input id="linkedin" dir="ltr" inputMode="url" value={draft.linkedin}
                onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })} />
              <span className="hint">נשמר כקישור בלבד. אי אפשר לקרוא לינקדאין אוטומטית.</span>
            </div>
            <div className="field">
              <label htmlFor="notes">הערות על המותג</label>
              <textarea id="notes" value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <span className="hint">אפשר להדביק כאן טקסט מלינקדאין או מקבצי מותג.</span>
            </div>
            <div className="row">
              <button className="btn secondary" onClick={analyze} disabled={analyzing}>
                {analyzing ? "קורא את האתר..." : p ? "קריאה מחדש של האתר" : "קריאת האתר"}
              </button>
              {analyzing && <small>זה לוקח כמה שניות.</small>}
            </div>
          </section>

          {p && (
            <section className="card">
              <h3 style={{ fontSize: "1.05rem" }}>פרופיל המותג</h3>
              <div className="field">
                <label htmlFor="summary">על החברה</label>
                <textarea id="summary" value={p.summary} onChange={(e) => setProfile({ summary: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="audience">קהל יעד</label>
                <input id="audience" value={p.audience} onChange={(e) => setProfile({ audience: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="tone">טון דיבור</label>
                <input id="tone" value={p.tone} onChange={(e) => setProfile({ tone: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="language">שפת התוכן</label>
                <input id="language" value={p.language} onChange={(e) => setProfile({ language: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="products">מוצרים ושירותים</label>
                <textarea id="products" value={p.products.join("\n")}
                  onChange={(e) => setProfile({ products: lines(e.target.value) })} />
                <span className="hint">שורה לכל פריט.</span>
              </div>
              <div className="field">
                <label htmlFor="avoid">מונחים שלא להשתמש בהם</label>
                <textarea id="avoid" value={p.avoid.join("\n")}
                  onChange={(e) => setProfile({ avoid: lines(e.target.value) })} />
                <span className="hint">שורה לכל מונח.</span>
              </div>
            </section>
          )}

          {formError && <span className="status bad" role="alert">{formError}</span>}

          <div className="row">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button className="btn secondary" onClick={() => { setDraft(null); setErrors({}); setFormError(""); }}>
              ביטול
            </button>
            {draft.id && (
              <button className="btn secondary" onClick={remove}>מחיקת החברה</button>
            )}
          </div>
        </>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
