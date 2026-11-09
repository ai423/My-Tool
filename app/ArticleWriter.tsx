"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Article, ArticleSeo, ArticleSource, Company, ResearchItem } from "@/lib/company";
import type { Check, ParsedBrief } from "@/lib/brief";

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
  compliance?: Check[] | null;
  meta?: string;
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
  const [provider, setProvider] = useState<"claude" | "tavily">("claude");
  const [mode, setMode] = useState<"topic" | "brief">("topic");
  const [briefText, setBriefText] = useState("");
  const [briefs, setBriefs] = useState<ParsedBrief[] | null>(null);
  const [briefIndex, setBriefIndex] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [briefError, setBriefError] = useState("");
  const brief = mode === "brief" && briefs ? briefs[briefIndex] : null;
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

  async function parseBrief() {
    if (briefText.trim().length < 80) {
      setBriefError("הדביקו את הבריף המלא, כולל הכותרות והמילות מפתח.");
      return;
    }
    setParsing(true);
    setBriefError("");
    setBriefs(null);
    try {
      const j = await call("/api/article/brief", { text: briefText });
      const list = j.briefs as ParsedBrief[];
      setBriefs(list);
      setBriefIndex(0);
      say(list.length > 1 ? `זוהו ${list.length} בריפים. בחרו איזה לכתוב.` : "הבריף נקרא. בדקו את מה שזוהה.");
    } catch (e) {
      setBriefError(e instanceof Error && e.message ? e.message : "לא הצלחתי לנתח את הבריף. נסו שוב.");
    } finally {
      setParsing(false);
    }
  }

  async function write() {
    if (mode === "topic" && !checkTopic()) return;
    if (mode === "brief" && !brief) return;
    setLoading(true);
    setStage(0);
    setError("");
    try {
      const t = brief ? brief.mainKeyword : topic.trim();
      const research = await call("/api/article/research", {
        companyId: company.id,
        topic: t,
        provider,
        brief: brief ?? undefined,
      });
      setStage(1);
      const d = await call("/api/article/draft", {
        companyId: company.id,
        topic: t,
        notes: research.notes,
        brief: brief ?? undefined,
        outline: research.outline,
      });
      setStage(2);
      const f = (await call("/api/article/finish", {
        companyId: company.id,
        topic: t,
        draft: d.draft,
        notes: research.notes,
        pages: research.pages,
        examplePages: research.examplePages,
        brief: brief ?? undefined,
      })) as unknown as Omit<Draft, "topic">;
      const pageList = research.pages as Array<{ url: string }>;
      const domains = new Set(pageList.map((p) => new URL(p.url).hostname.replace(/^www\./, ""))).size;
      setDraft({
        topic: t,
        ...f,
        meta: `חיפוש עם ${provider === "tavily" ? "Tavily" : "Claude"}: נקראו ${pageList.length} מקורות מ-${domains} אתרים`,
      });
      const failed = f.compliance?.filter((c) => !c.ok).length ?? 0;
      say(
        failed
          ? `נכתבו ${f.words} מילים. ${failed} בדיקות בבריף לא עברו.`
          : `נכתבו ${f.words} מילים. עברו על האזהרות ושמרו.`
      );
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
          <label htmlFor="mode">סוג כתיבה</label>
          <select id="mode" value={mode} disabled={loading}
            onChange={(e) => { setMode(e.target.value as "topic" | "brief"); setError(""); }}>
            <option value="topic">נושא בלבד</option>
            <option value="brief">לפי בריף</option>
          </select>
        </div>

        {mode === "topic" ? (
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
        ) : (
          <>
            <div className="field">
              <label htmlFor="brief">בריף</label>
              <textarea
                id="brief"
                style={{ minHeight: 160 }}
                value={briefText}
                disabled={loading || parsing}
                onChange={(e) => { setBriefText(e.target.value); setBriefs(null); }}
              />
              {briefError && <span className="error">{briefError}</span>}
              <span className="hint">הדביקו בריף אחד או מסמך עם כמה בריפים. הכלי מזהה כתובת, אורך, כותרות, מילות מפתח, שאלות וקישורים.</span>
            </div>

            {briefs && briefs.length > 1 && (
              <div className="field">
                <label htmlFor="which">איזה בריף לכתוב</label>
                <select id="which" value={briefIndex} disabled={loading}
                  onChange={(e) => setBriefIndex(Number(e.target.value))}>
                  {briefs.map((b, i) => (
                    <option key={i} value={i}>{b.name}: {b.mainKeyword}</option>
                  ))}
                </select>
              </div>
            )}

            {brief && (
              <div className="stack" style={{ background: "var(--surface-2)", borderRadius: "var(--radius-sm)", padding: 12 }}>
                <strong>מה זוהה בבריף</strong>
                <small>כתובת: <span dir="ltr">{brief.url || "לא צוינה"}</span></small>
                <small>אורך: <span className="numeric">{brief.wordCount}</span> מילים, כולל השאלות הנפוצות</small>
                <small>מילות מפתח: {brief.keywords.join(", ")}</small>
                <small>כותרות: {brief.sections.map((x) => x.title).join(" | ")}</small>
                <small>
                  שאלות נפוצות: <span className="numeric">{brief.faqQuestions.length}</span>, תשובות של{" "}
                  <span className="numeric">{brief.faqMinWords}</span> עד <span className="numeric">{brief.faqMaxWords}</span> מילים
                </small>
                <small>קישורים פנימיים: <span className="numeric">{brief.internalLinks.length}</span></small>
                <small>דפי דוגמה לקריאה בלבד: <span className="numeric">{brief.examples.length}</span></small>
              </div>
            )}
          </>
        )}

        <div className="field">
          <label htmlFor="provider">מנוע חיפוש</label>
          <select id="provider" value={provider} disabled={loading}
            onChange={(e) => setProvider(e.target.value as "claude" | "tavily")}>
            <option value="claude">Claude</option>
            <option value="tavily">Tavily</option>
          </select>
          <span className="hint">אפשר לכתוב את אותו נושא בשני המנועים ולהשוות.</span>
        </div>

        <div className="row">
          {mode === "topic" ? (
            <button className={draft ? "btn secondary" : "btn"} onClick={write} disabled={loading}>
              {loading ? "כותב את המאמר..." : draft ? "כתיבה מחדש" : "כתיבת מאמר"}
            </button>
          ) : (
            <>
              <button className={brief ? "btn secondary" : "btn"} onClick={parseBrief} disabled={loading || parsing}>
                {parsing ? "מנתח את הבריף..." : brief ? "ניתוח מחדש" : "ניתוח הבריף"}
              </button>
              {brief && (
                <button className={draft ? "btn secondary" : "btn"} onClick={write} disabled={loading}>
                  {loading ? "כותב לפי הבריף..." : draft ? "כתיבה מחדש" : "כתיבה לפי הבריף"}
                </button>
              )}
            </>
          )}
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
            <small>התהליך המלא לוקח 3 עד 4 דקות. אל תסגרו את הדף.</small>
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
              {draft.meta ? ` · ${draft.meta}` : ""}
            </small>
          </div>

          {draft.notes.map((n) => (
            <span key={n} className="status warn" role="status">{n}</span>
          ))}

          {draft.compliance && draft.compliance.length > 0 && (
            <div className="stack">
              <strong style={{ fontSize: "0.95rem" }}>עמידה בבריף</strong>
              {draft.compliance.map((c) => (
                <div key={c.label}>
                  <span className={`status ${c.ok ? "ok" : "warn"}`}>{c.ok ? "עומד" : "לא עומד"}</span>{" "}
                  <strong>{c.label}:</strong> {c.detail}
                </div>
              ))}
            </div>
          )}

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
