import { NextResponse } from "next/server";
import { askClaude, askClaudeWithSearch, hasClaudeKey } from "@/lib/claude";
import {
  buildEditPrompt,
  buildEditSystem,
  buildPrompt,
  buildSystem,
  processArticle,
} from "@/lib/article";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/company";

// POST { companyId, topic } -> { title, content, sources, words, notes }
// חיפוש ברשת וכתיבה לוקחים בערך דקה. ההרשאה נבדקת ב-middleware.
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!hasClaudeKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY לא מוגדר. ראו .env.example" },
      { status: 503 }
    );
  }

  let body: { companyId?: string; topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "הבקשה לא תקינה." }, { status: 400 });
  }

  const topic = (body.topic ?? "").trim();
  if (topic.length < 3 || topic.length > 200) {
    return NextResponse.json(
      { error: "צריך נושא של 3 עד 200 תווים." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", body.companyId ?? "")
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "לא מצאתי את החברה." }, { status: 404 });
  }

  try {
    const { text, sources } = await askClaudeWithSearch(
      buildPrompt(company as Company, topic),
      { system: buildSystem(), maxTokens: 8000, maxSearches: 6 }
    );
    if (!text) throw new Error("empty");

    // סבב עריכה. אם הוא נכשל, ממשיכים עם הטיוטה כמו שהיא.
    let final = text;
    try {
      const edited = await askClaude(buildEditPrompt(company as Company, topic, text), {
        system: buildEditSystem(),
        maxTokens: 8000,
      });
      if (/^# /m.test(edited)) final = edited;
    } catch {
      // הטיוטה המקורית נשארת
    }

    const competitors = (company as Company).profile?.competitors ?? [];
    return NextResponse.json(await processArticle(final, sources, competitors));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const searchOff = /web_search|tool/i.test(msg) && /400|403/.test(msg);
    return NextResponse.json(
      {
        error: searchOff
          ? "חיפוש הרשת לא מופעל בחשבון Anthropic. הפעילו אותו ב-console.anthropic.com תחת Settings."
          : "לא הצלחתי לכתוב את המאמר. נסו שוב.",
      },
      { status: 500 }
    );
  }
}
