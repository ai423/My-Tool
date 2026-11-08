"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Article, ArticleSource, Company } from "@/lib/company";

type Draft = {
  id?: string;
  topic: string;
  title: string;
  content: string;
  sources: ArticleSource[];
  words: number;
  notes: string[];
};

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
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Article[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSlow(false);
    setError("");
    slowTimer.current = setTimeout(() => setSlow(true), 3000);
    try {
      const r = await fetch("/api/article/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId: company.id, topic: topic.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setDraft({ topic: topic.trim(), ...j });
      say(`נכתבו ${j.words} מילים. עברו על המאמר ושמרו.`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "לא הצלחתי לכתוב את המאמר. נסו שוב.");
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setLoading(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const title = draft.content.match(/^# (.+)$/m)?.[1].trim() ?? draft.title;
    const row = { company_id: company.id, topic: draft.topic, title, content: draft.content, sources: draft.sources };
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
          <span className="hint">הכלי מחפש מקורות אמיתיים וכותב כ-1,200 מילים בקול של המותג.</span>
        </div>
        <div className="row">
          <button className={draft ? "btn secondary" : "btn"} onClick={write} disabled={loading}>
            {loading ? "כותב את המאמר..." : draft ? "כתיבה מחדש" : "כתיבת מאמר"}
          </button>
        </div>
        {loading && (
          <div className="stack" aria-busy="true">
            <div className="skeleton" style={{ height: 20 }} />
            <div className="skeleton" style={{ height: 20, width: "80%" }} />
            <div className="skeleton" style={{ height: 20, width: "60%" }} />
            {slow && (
              <small>
                הכלי מחפש מקורות, בודק קישורים וכותב. זה לוקח כדקה, אל תסגרו את הדף.
              </small>
            )}
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
