import { NextResponse } from "next/server";
import { askClaude, hasClaudeKey } from "@/lib/claude";
import type { BrandProfile } from "@/lib/company";

// POST { website, linkedin?, notes? } -> { profile }
// קורא את דף הבית של האתר, ו-Claude מחלץ ממנו פרופיל מותג. ההרשאה נבדקת ב-middleware.

function isPublicUrl(raw: string): URL | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const h = u.hostname.toLowerCase();
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return null;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.includes(":")) return null;
    if (!h.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? "";
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return `כותרת: ${title}\nתיאור: ${desc}\nתוכן: ${body}`.slice(0, 12000);
}

export async function POST(req: Request) {
  if (!hasClaudeKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY לא מוגדר. ראו .env.example" },
      { status: 503 }
    );
  }

  let body: { website?: string; linkedin?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "הבקשה לא תקינה." }, { status: 400 });
  }

  const url = isPublicUrl((body.website ?? "").trim());
  if (!url) {
    return NextResponse.json(
      { error: "צריך כתובת אתר תקינה, למשל example.co.il" },
      { status: 400 }
    );
  }

  let page = "";
  try {
    const r = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; BrandReader/1.0)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!r.ok) throw new Error(String(r.status));
    page = htmlToText(await r.text());
  } catch {
    return NextResponse.json(
      { error: "לא הצלחתי לקרוא את האתר. בדקו את הכתובת, או הדביקו טקסט על המותג בשדה ההערות." },
      { status: 422 }
    );
  }

  const prompt = `להלן תוכן דף הבית של חברה, ומידע נוסף מהמשתמש.
אתר: ${url.href}
לינקדאין (קישור בלבד): ${body.linkedin ?? ""}
הערות על המותג: ${(body.notes ?? "").slice(0, 3000)}

${page}

החזר JSON בלבד, בלי טקסט לפניו או אחריו, בצורה הזאת:
{"summary":"2-3 משפטים על מה החברה עושה","audience":"קהל היעד","tone":"טון הדיבור של המותג, כפי שהוא נשמע באתר","language":"שפת התוכן של האתר","products":["מוצר או שירות"],"avoid":["מונח או ניסוח שהמותג לא משתמש בו"]}
כתוב בעברית. אל תמציא עובדות שלא מופיעות בתוכן. אם משהו לא ידוע, השאר מחרוזת ריקה או רשימה ריקה.`;

  try {
    const raw = await askClaude(prompt, {
      system: "אתה אנליסט מותג. אתה עונה ב-JSON תקין בלבד.",
      maxTokens: 1500,
    });
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const p = JSON.parse(json) as Partial<BrandProfile>;
    const profile: BrandProfile = {
      summary: String(p.summary ?? ""),
      audience: String(p.audience ?? ""),
      tone: String(p.tone ?? ""),
      language: String(p.language ?? "עברית"),
      products: Array.isArray(p.products) ? p.products.map(String) : [],
      avoid: Array.isArray(p.avoid) ? p.avoid.map(String) : [],
      positioning: "",
      competitors: [],
    };
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json(
      { error: "לא הצלחתי לנתח את האתר. נסו שוב." },
      { status: 500 }
    );
  }
}
