import { NextResponse } from "next/server";
import { extractNotes, findPages, readPages } from "@/lib/research";
import { fail, loadRequest } from "@/lib/article-api";

// שלב 1: מוצא מקורות, קורא את העמודים, ומחלץ פתקי מחקר מאומתים.
export const maxDuration = 300;

export async function POST(req: Request) {
  const r = await loadRequest(req);
  if ("error" in r) return r.error;
  try {
    const refs = await findPages(r.topic, r.company);
    const pages = await readPages(refs);
    if (pages.length === 0) {
      return fail("לא הצלחתי לקרוא אף מקור לנושא הזה. נסו נושא אחר או ניסוח אחר.", 422);
    }
    const { notes, dropped } = await extractNotes(
      r.topic,
      r.company.profile?.language || "עברית",
      pages
    );
    if (notes.facts.length + notes.stats.length === 0) {
      return fail("לא נמצא במקורות חומר שאפשר לסמוך עליו. נסו ניסוח אחר של הנושא.", 422);
    }
    return NextResponse.json({
      notes,
      pages: pages.map(({ url, title }) => ({ url, title })),
      dropped,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const searchOff = /web_search|tool/i.test(msg) && /400|403/.test(msg);
    return fail(
      searchOff
        ? "חיפוש הרשת לא מופעל בחשבון Anthropic. הפעילו אותו ב-console.anthropic.com תחת Settings."
        : "לא הצלחתי לאסוף מקורות. נסו שוב."
    );
  }
}
