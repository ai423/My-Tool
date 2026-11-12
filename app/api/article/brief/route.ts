import { NextResponse } from "next/server";
import { askClaude, hasClaudeKey } from "@/lib/claude";
import { buildBriefParsePrompt, validateBriefs } from "@/lib/brief";
import { fail } from "@/lib/article-api";

// POST { text } -> { briefs }. מפרק טקסט של בריף אחד או כמה בריפים לשדות.
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!hasClaudeKey()) return fail("ANTHROPIC_API_KEY לא מוגדר. ראו .env.example", 503);
  let text = "";
  try {
    text = String(((await req.json()) as { text?: string }).text ?? "").trim();
  } catch {
    return fail("הבקשה לא תקינה.", 400);
  }
  if (text.length < 80) return fail("הדביקו את הבריף המלא, כולל הכותרות והמילות מפתח.", 400);
  try {
    const raw = await askClaude(buildBriefParsePrompt(text), {
      system: "אתה מנתח בריפים. אתה עונה ב-JSON תקין בלבד, בלי טקסט לפניו או אחריו.",
      maxTokens: 7000,
    });
    const briefs = validateBriefs(raw);
    if (briefs.length === 0)
      return fail("לא הצלחתי לזהות בריף בטקסט. בדקו שיש בו נושא מרכזי וכותרות H2.", 422);
    return NextResponse.json({ briefs });
  } catch {
    return fail("לא הצלחתי לנתח את הבריף. נסו שוב.");
  }
}
