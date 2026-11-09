import { NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import {
  buildEditPrompt,
  buildEditSystem,
  buildSeoPrompt,
  companyClaims,
  computeIssues,
  finalizeSeo,
  issuesToNotes,
  processArticle,
} from "@/lib/article";
import { fail, loadRequest } from "@/lib/article-api";
import { readPages, type Notes, type PageRef } from "@/lib/research";
import type { ResearchItem } from "@/lib/company";

// שלב 3: בדיקות בקוד, עריכה לפי הממצאים, בדיקה חוזרת וחבילת SEO.
export const maxDuration = 300;

export async function POST(req: Request) {
  const r = await loadRequest(req);
  if ("error" in r) return r.error;
  const notes = r.body.notes as Notes | undefined;
  const refs = r.body.pages as PageRef[] | undefined;
  const draft = String(r.body.draft ?? "");
  if (!notes || !Array.isArray(refs) || !draft) return fail("חסרים נתונים לשלב הבדיקה.", 400);

  try {
    // קוראים את המקורות שוב כדי להשוות את הטיוטה לטקסט האמיתי שלהם
    const pages = await readPages(refs);
    const before = computeIssues(draft, notes, pages, r.company, r.topic);

    const [edited, seoRaw] = await Promise.all([
      askClaude(buildEditPrompt(r.company, r.topic, draft, before), {
        system: buildEditSystem(),
        maxTokens: 8000,
      }).catch(() => ""),
      askClaude(buildSeoPrompt(r.company, r.topic, draft), { maxTokens: 700 }).catch(() => ""),
    ]);

    const final = /^# /m.test(edited) ? edited : draft;
    const processed = await processArticle(
      final,
      refs,
      r.company.profile?.competitors ?? [],
      r.company.website
    );

    // בדיקה חוזרת אחרי העריכה: מה שנשאר מוצג כאזהרה
    const after = computeIssues(processed.content, notes, pages, r.company, r.topic);

    const research: ResearchItem[] = [
      ...notes.facts.map((f) => ({ kind: "עובדה", text: f.claim, url: f.url })),
      ...notes.stats.map((s) => ({ kind: "נתון", text: `${s.stat} (${s.context})`, url: s.url })),
      ...notes.quotes.map((q) => ({ kind: "ציטוט", text: `"${q.text}" ${q.speaker}, ${q.role}`, url: q.url })),
    ];

    return NextResponse.json({
      ...processed,
      notes: [
        ...processed.notes,
        ...issuesToNotes(after),
        ...(pages.length < refs.length ? [`נקראו ${pages.length} מתוך ${refs.length} מקורות. בדיקת הדמיון חלקית.`] : []),
      ],
      companyClaims: companyClaims(processed.content, r.company),
      research,
      seo: finalizeSeo(seoRaw, processed.content),
    });
  } catch {
    return fail("לא הצלחתי לסיים את בדיקת המאמר. נסו שוב.");
  }
}
