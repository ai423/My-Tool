import { NextResponse } from "next/server";
import { hasClaudeKey } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/company";

// קוד משותף לשלוש נקודות הקצה של כתיבת מאמר: בדיקות קלט וטעינת החברה.
export async function loadRequest(
  req: Request
): Promise<
  | { error: NextResponse }
  | { company: Company; topic: string; body: Record<string, unknown> }
> {
  if (!hasClaudeKey()) {
    return {
      error: NextResponse.json({ error: "ANTHROPIC_API_KEY לא מוגדר. ראו .env.example" }, { status: 503 }),
    };
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "הבקשה לא תקינה." }, { status: 400 }) };
  }
  const topic = String(body.topic ?? "").trim();
  if (topic.length < 3 || topic.length > 200) {
    return { error: NextResponse.json({ error: "צריך נושא של 3 עד 200 תווים." }, { status: 400 }) };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", String(body.companyId ?? ""))
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "לא מצאתי את החברה." }, { status: 404 }) };
  return { company: data as Company, topic, body };
}

export function fail(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
