import { NextResponse } from "next/server";
import {
  distinctDomains,
  extractNotes,
  extractOutline,
  gatherPages,
  MIN_DOMAINS,
  readPages,
  type Provider,
} from "@/lib/research";
import type { ParsedBrief } from "@/lib/brief";
import { fail, loadRequest } from "@/lib/article-api";

// שלב 1: מוצא מקורות, קורא את העמודים, ומחלץ פתקי מחקר מאומתים.
export const maxDuration = 300;

export async function POST(req: Request) {
  const r = await loadRequest(req);
  if ("error" in r) return r.error;
  try {
    const provider: Provider = r.body.provider === "tavily" ? "tavily" : "claude";
    const pages = await gatherPages(r.topic, r.company, provider);
    if (pages.length === 0) {
      return fail("לא הצלחתי לקרוא אף מקור לנושא הזה. נסו נושא אחר או ניסוח אחר.", 422);
    }
    if (distinctDomains(pages) < MIN_DOMAINS) {
      return fail(
        `נמצאו מקורות מ-${distinctDomains(pages)} אתרים בלבד, ולא מספיק למאמר אמין. נסו ניסוח מדויק או רחב יותר של הנושא.`,
        422
      );
    }
    const { notes, dropped } = await extractNotes(
      r.topic,
      r.company.profile?.language || "עברית",
      pages
    );
    if (notes.facts.length + notes.stats.length === 0) {
      return fail("לא נמצא במקורות חומר שאפשר לסמוך עליו. נסו ניסוח אחר של הנושא.", 422);
    }

    // בבריף: דפי הדוגמה נקראים לכיסוי ולבדיקת העתקה בלבד, ולא משמשים מקור
    const brief = r.body.brief as ParsedBrief | undefined;
    const examples = brief?.examples?.length
      ? await readPages(brief.examples.map((url) => ({ url, title: url })))
      : [];
    const outline = await extractOutline(examples);

    return NextResponse.json({
      notes,
      pages: pages.map(({ url, title }) => ({ url, title })),
      examplePages: examples.map(({ url, title }) => ({ url, title })),
      outline,
      dropped,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "TAVILY_KEY_MISSING")
      return fail("TAVILY_API_KEY לא מוגדר ב-Vercel. הוסיפו אותו, פרסו מחדש, או בחרו חיפוש עם Claude.", 503);
    if (msg === "TAVILY_AUTH")
      return fail("המפתח של Tavily נדחה. בדקו אותו ב-Vercel, או בחרו חיפוש עם Claude.", 401);
    const searchOff = /web_search|tool/i.test(msg) && /400|403/.test(msg);
    return fail(
      searchOff
        ? "חיפוש הרשת לא מופעל בחשבון Anthropic. הפעילו אותו ב-console.anthropic.com תחת Settings."
        : "לא הצלחתי לאסוף מקורות. נסו שוב."
    );
  }
}
