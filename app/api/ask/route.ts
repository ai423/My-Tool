import { NextResponse } from "next/server";
import { askClaude, hasClaudeKey } from "@/lib/claude";

// נקודת קצה לדוגמה: POST /api/ask עם { "prompt": "..." }
// מחזירה { "answer": "..." }. מוחקים אם הכלי לא צריך AI בזמן ריצה.

export async function POST(req: Request) {
  if (!hasClaudeKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY לא מוגדר. ראו .env.example" },
      { status: 503 }
    );
  }

  let prompt = "";
  try {
    const body = (await req.json()) as { prompt?: string };
    prompt = (body.prompt ?? "").trim();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה חייב להיות JSON עם שדה prompt" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "שדה prompt ריק" }, { status: 400 });
  }

  try {
    const answer = await askClaude(prompt, {
      system: "ענה בעברית, קצר וענייני.",
    });
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה לא ידועה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
