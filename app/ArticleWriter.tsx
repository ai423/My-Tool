"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Article, ArticleSeo, ArticleSource, Company, ResearchItem } from "@/lib/company";

type Draft = {
  id?: string;
  topic: string;
  title: string;
  content: string;
  sources: ArticleSource[];
  words: number;
  notes: string[];
  seo: ArticleSeo | null;
  companyClaims: string[];
  research: ResearchItem[];
};

const STAGES = ["מחפש מקורות וקורא אותם", "כותב את המאמר", "בודק ומשפר"];

async function call(path: string, body: unknown) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let j: { error?: string } & Record<string, unknown>;
  try {
    j = await r.json();
  } catch {
    throw new Error("השרת לא ענה בזמן. נסו שוב.");
  }
  if (!r.ok) throw new Error(j.error || "שגיאה לא ידועה.");
  return j;
}

const wordCount = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").split(/\s+/).filter(Boolean).length;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export default function ArticleWriter({
  company,
  onBack,
}: {
  company: Company;
  onBack: () => void;
}) {
  const supabase = createClient();
  const [topic, setTopic] = useState("");
  const [topicError, setTopicError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Article[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 4000);
  };

  const loadSaved = useCallback(async () => {
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setSaved((data as Article[]) ?? []);
  }, [supabase, company.id]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  function checkTopic() {
    const t = topic.trim();
    setTopicError(t.length >= 3 ? "" : "צריך נושא של 3 תווים לפחות, למשל: איך בוחרים מערכת ניהול ידע");
    return t.length >= 3;
  }

  async function write() {
    if (!checkTopic()) return;
    setLoading(true);
    setStage(0);
    setError("");
    try {
      const t = topic.trim();
      const research = await call("/api/article/research", { companyId: company.id, topic: t });
      setStage(1);
      const d = await call("/api/article/draft", { companyId: company.id, topic: t, notes: research.notes });
      setStage(2);
      const f = (await call("/api/article/finish", {
        companyId: company.id,
        topic: t,
        draft: d.draft,
        notes: research.notes,
        pages: research.pages,
      })) as unknown as Omit<Draft, "topic">;
      setDraft({ topic: t, ...f });
      say(`נכתבו ${f.words} מילים. עברו על האזהרות ושמרו.`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "לא הצלחתי לכתוב את המאמר. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const title = draft.content.match(/^# (.+)$/m)?.[1].trim() ?? draft.title;
    const row = { company_id: company.id, topic: draft.topic, title, content: draft.content, sources: draft.sources, seo: draft.seo };
    const { data, error: err } = draft.id
      ? await supabase.from("articles").update(row).eq("id", draft.id).select().single()
      : await supabase.from("articles").insert(row).select().single();
    setSaving(false);
    if (err || !data) {
      setError("לא הצלחתי לשמור. נסו שוב.");
      return;
    }
    setDraft({ ...draft, id: (data as Article).id, title });
    say("נשמר");
    loadSaved();
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.content);
      say("הועתק");
    } catch {
      say("לא הצלחתי להעתיק. סמנו את הטקסט והעתיקו ידנית.");
    }
  }

  function open(a: Article) {
    setTopic(a.topic);
    setError("");
    setDraft({
      id: a.id,
      topic: a.topic,
      title: a.title,
      content: a.content,
      sources: a.sources,
      words: wordCount(a.content),
      notes: [],
      seo: a.seo ?? null,
      companyClaims: [],
      research: [],
    });
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "1.25rem" }}>מאמר חדש: {company.name}</h2>
        <button className="btn secondary" onClick={onBack}>חזרה לחברות</button>
      </div>

      <section className="card">
        <div className="field">
          <label htmlFor="topic">נושא המאמר</label>
          <input
            id="topic"
            value={topic}
            onBlur={() => topic && checkTopic()}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
          />
          {topicError && <span className="error">{topicError}</span>}
          <span className="hint">הכלי קורא מקורות אמיתיים, בודק אותם וכותב כ-1,200 מילים בקול של המותג.</span>
        </div>
        <div className="row">
          <button className={draft ? "btn secondary" : "btn"} onClick={write} disabled={loading}>
            {loading ? "כותב את המאמר..." : draft ? "כתיבה מחדש" : "כתיבת מאמר"}
          </button>
        </div>
        {loading && (
          <div className="stack" aria-busy="true">
            <ol style={{ margin: 0, paddingInlineStart: 22, display: "grid", gap: 6 }}>
              {STAGES.map((name, i) => (
                <li key={name} style={{ color: i <= stage ? "var(--ink)" : "var(--ink-3)", fontWeight: i === stage ? 600 : 400 }}>
                  {name}
                  {i < stage && " (הושלם)"}
                </li>
              ))}
            </ol>
            <div className="skeleton" style={{ height: 20 }} />
            <small>התהליך המלא לוקח 2 עד 3 דקות. אל תסגרו את הדף.</small>
          </div>
        )}
      </section>

      {error && <span className="status bad" role="alert">{error}</span>}

      {draft && !loading && (
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1.05rem" }}>המאמר</h3>
            <small>
              <span className="numeric">{wordCount(draft.content)}</span> מילים
            </small>
          </div>

          {draft.notes.map((n) => (
            <span key={n} className="status warn" role="status">{n}</span>
          ))}

          <div className="field">
            <label htmlFor="content">תוכן (Markdown, אפשר לערוך)</label>
            <textarea
              id="content"
              style={{ minHeight: 420 }}
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            />
          </div>

          <div>
            <strong style={{ fontSize: "0.95rem" }}>מקורות שנבדקו ({draft.sources.length})</strong>
            {draft.sources.length === 0 ? (
              <p className="muted">אין מקורות מאומתים במאמר.</p>
            ) : (
              <ul style={{ margin: "8px 0 0", paddingInlineStart: 20, display: "grid", gap: 6 }}>
                {draft.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>{" "}
                    <span className="status ok">קישור פעיל</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {draft.seo && (
            <div className="stack">
              <strong style={{ fontSize: "0.95rem" }}>חבילת SEO</strong>
              <div className="field">
                <label htmlFor="seo-title">כותרת SEO</label>
                <input id="seo-title" readOnly value={draft.seo.seoTitle} />
              </div>
              <div className="field">
                <label htmlFor="seo-meta">תיאור מטא ({draft.seo.metaDescription.length} מתוך 150 תווים)</label>
                <textarea id="seo-meta" readOnly style={{ minHeight: 72 }} value={draft.seo.metaDescription} />
              </div>
              <div className="field">
                <label htmlFor="seo-slug">כתובת (slug)</label>
                <input id="seo-slug" dir="ltr" readOnly value={draft.seo.slug} />
              </div>
              <small>
                מילת מפתח מרכזית: <strong>{draft.seo.primaryKeyword}</strong>, מופיעה{" "}
                <span className="numeric">{draft.seo.keywordCount}</span> פעמים
              </small>
            </div>
          )}

          {draft.companyClaims.length > 0 && (
            <details>
              <summary>משפטים שמזכירים את החברה, לאישור מול הלקוח ({draft.companyClaims.length})</summary>
              <ul style={{ margin: "8px 0 0", paddingInlineStart: 20, display: "grid", gap: 6 }}>
                {draft.companyClaims.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}

          {draft.research.length > 0 && (
            <details>
              <summary>חומר המחקר, כל פריט עם המקור שלו ({draft.research.length})</summary>
              <ul style={{ margin: "8px 0 0", paddingInlineStart: 20, display: "grid", gap: 6 }}>
                {draft.research.map((r, i) => (
                  <li key={i}>
                    <span className="status ok">{r.kind}</span> {r.text}{" "}
                    <a href={r.url} target="_blank" rel="noopener noreferrer">מקור</a>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="row">
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "שומר..." : draft.id ? "שמירת שינויים" : "שמירה"}
            </button>
            <button className="btn secondary" onClick={copy}>העתקה</button>
          </div>
        </section>
      )}

      <h3 style={{ fontSize: "1.05rem" }}>מאמרים שמורים</h3>
      {saved === null && <div className="skeleton" style={{ height: 56 }} aria-busy="true" />}
      {saved && saved.length === 0 && (
        <div className="card empty">
          <p>עוד אין מאמרים לחברה הזאת. הקלידו נושא ולחצו "כתיבת מאמר".</p>
        </div>
      )}
      {saved && saved.length > 0 && (
        <div className="stack">
          {saved.map((a) => (
            <button
              key={a.id}
              className="card"
              style={{ textAlign: "start", cursor: "pointer", font: "inherit", color: "inherit" }}
              onClick={() => open(a)}
            >
              <strong>{a.title}</strong>
              <small>
                <span className="numeric">{fmtDate(a.created_at)}</span> · {a.topic}
              </small>
            </button>
          ))}
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
