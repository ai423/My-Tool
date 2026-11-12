import { NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import {
  buildEditPrompt,
  buildEditSystem,
  buildSeoPrompt,
  companyClaims,
  computeIssues,
  countKeyword,
  finalizeSeo,
  issuesToNotes,
  processArticle,
  type Issues,
  type Seo,
} from "@/lib/article";
import { buildBriefEditPrompt, checkBrief, type ParsedBrief } from "@/lib/brief";
import { fail, loadRequest } from "@/lib/article-api";
import { readPages, type Notes, type PageRef } from "@/lib/research";
import type { ResearchItem } from "@/lib/company";

// שלב 3: בדיקות בקוד, עריכה לפי הממצאים, בדיקה חוזרת וחבילת SEO.
// בבריף: גם בדיקות עמידה בבריף, ועד שני סבבי עריכה.
export const maxDuration = 300;

const hasQualityIssues = (i: Issues) =>
  i.unsupported.length + i.repeated.length + i.copied.length > 0;

// בבריף אין מגבלת אורך כללית ואין דרישת מקור לכל חלק
const forBrief = (i: Issues): Issues => ({ ...i, words: 0, unsourcedSections: [] });

const slugOf = (url: string) => {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
};

export async function POST(req: Request) {
  const r = await loadRequest(req);
  if ("error" in r) return r.error;
  const notes = r.body.notes as Notes | undefined;
  const refs = r.body.pages as PageRef[] | undefined;
  const exampleRefs = (r.body.examplePages as PageRef[] | undefined) ?? [];
  const brief = r.body.brief as ParsedBrief | undefined;
  const draft = String(r.body.draft ?? "");
  if (!notes || !Array.isArray(refs) || !draft) return fail("חסרים נתונים לשלב הבדיקה.", 400);

  try {
    // קוראים את המקורות שוב כדי להשוות את הטיוטה לטקסט האמיתי שלהם. דפי דוגמה נכללים בבדיקת הדמיון.
    const pages = await readPages([...refs, ...exampleRefs]);
    const issuesOf = (text: string): Issues => {
      const i = computeIssues(text, notes, pages, r.company, r.topic);
      return brief ? forBrief(i) : i;
    };

    const seoPromise = askClaude(buildSeoPrompt(r.company, r.topic, draft), { maxTokens: 700 }).catch(() => "");
    let current = draft;

    if (brief) {
      for (let pass = 0; pass < 2; pass++) {
        const { violations } = checkBrief(current, brief);
        const issues = issuesOf(current);
        if (pass > 0 && violations.length === 0 && !hasQualityIssues(issues)) break;
        const edited = await askClaude(buildBriefEditPrompt(r.company, brief, current, violations, issues), {
          system: buildEditSystem(),
          maxTokens: 6000,
        }).catch(() => "");
        if (/^# /m.test(edited)) current = edited;
      }
    } else {
      const edited = await askClaude(buildEditPrompt(r.company, r.topic, draft, issuesOf(draft)), {
        system: buildEditSystem(),
        maxTokens: 8000,
      }).catch(() => "");
      if (/^# /m.test(edited)) current = edited;
    }

    const processed = await processArticle(
      current,
      refs,
      r.company.profile?.competitors ?? [],
      r.company.website,
      brief
        ? [...brief.internalLinks, ...(r.company.profile?.facts ?? []).map((f) => f.url).filter(Boolean)]
        : undefined
    );

    // בדיקה חוזרת אחרי העריכה והניקוי: מה שנשאר מוצג כאזהרה
    const after = issuesOf(processed.content);
    const compliance = brief ? checkBrief(processed.content, brief).checks : null;

    const research: ResearchItem[] = [
      ...notes.facts.map((f) => ({ kind: "עובדה", text: f.claim, url: f.url })),
      ...notes.stats.map((s) => ({ kind: "נתון", text: `${s.stat} (${s.context})`, url: s.url })),
      ...notes.quotes.map((q) => ({ kind: "ציטוט", text: `"${q.text}" ${q.speaker}, ${q.role}`, url: q.url })),
    ];

    let seo: Seo | null = finalizeSeo(await seoPromise, processed.content);
    if (brief) {
      seo = {
        primaryKeyword: brief.mainKeyword,
        seoTitle: seo?.seoTitle ?? processed.title,
        metaDescription: seo?.metaDescription ?? "",
        slug: slugOf(brief.url) || seo?.slug || "",
        keywordCount: countKeyword(processed.content, brief.mainKeyword),
      };
    }

    return NextResponse.json({
      ...processed,
      notes: [
        ...processed.notes,
        ...issuesToNotes(after),
        ...(pages.length < refs.length + exampleRefs.length
          ? [`נקראו ${pages.length} מתוך ${refs.length + exampleRefs.length} מקורות. בדיקת הדמיון חלקית.`]
          : []),
      ],
      companyClaims: companyClaims(processed.content, r.company),
      research,
      seo,
      compliance,
    });
  } catch {
    return fail("לא הצלחתי לסיים את בדיקת המאמר. נסו שוב.");
  }
}
