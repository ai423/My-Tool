import { NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import { buildPrompt, buildSystem } from "@/lib/article";
import { fail, loadRequest } from "@/lib/article-api";
import { buildBriefPrompt, buildBriefSystem, type ParsedBrief } from "@/lib/brief";
import type { Notes } from "@/lib/research";

// שלב 2: כתיבה מתוך פתקי המחקר בלבד, בלי חיפוש ובלי גישה לטקסט המקורות.
export const maxDuration = 300;

export async function POST(req: Request) {
  const r = await loadRequest(req);
  if ("error" in r) return r.error;
  const notes = r.body.notes as Notes | undefined;
  if (!notes || !Array.isArray(notes.facts)) return fail("חסרים פתקי מחקר.", 400);
  try {
    const brief = r.body.brief as ParsedBrief | undefined;
    const outline = Array.isArray(r.body.outline) ? (r.body.outline as string[]) : [];
    const draft = await askClaude(
      brief ? buildBriefPrompt(r.company, brief, notes, outline) : buildPrompt(r.company, r.topic, notes),
      { system: brief ? buildBriefSystem() : buildSystem(), maxTokens: 8000 }
    );
    if (!draft.trim()) throw new Error("empty");
    return NextResponse.json({ draft });
  } catch {
    return fail("לא הצלחתי לכתוב את המאמר. נסו שוב.");
  }
}
