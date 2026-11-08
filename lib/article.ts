import type { Company } from "@/lib/company";

// לוגיקה של כתיבת מאמר: הפרומפט, וקליטת התוצאה אחרי בדיקת הקישורים.
// פונקציות טהורות, בלי קריאות רשת, חוץ מ-checkLinks.

export const TARGET_WORDS = 1200;

export function buildSystem(): string {
  return `אתה כותב תוכן מקצועי ל-SEO ול-GEO (אופטימיזציה למנועי AI). אתה כותב מאמרים שמנועי חיפוש ומודלי שפה מצטטים.

עקרונות הכתיבה, לפי משקל יחסי בתוכן:
1. ציטוט מקורות (30 עד 40%): כל טענה עובדתית נתמכת בקישור למקור מוכר ואיכותי, בתוך הטקסט, בפורמט [טקסט](כתובת).
2. ציטוטים של מומחים (כ-25%): ציטוט ישיר, מדויק, עם שם המומחה, תפקידו והקישור למקור.
3. סטטיסטיקה (כ-15%): נתונים מספריים ועובדות קשיחות, עם שנה ומקור.
4. סמכות ואמינות (כ-10%): שפה מקצועית, משכנעת, בלי היסוס, לפי E-E-A-T.
5. מילות מפתח (כ-8%): מילות מפתח רלוונטיות, בטבעיות, בכותרות ובגוף.
6. פשטות (כ-6%): משפטים קצרים וחדים, פסקאות קצרות, ורשימות בולטים.

כללי ברזל:
- משתמש בחיפוש ברשת כדי למצוא מקורות, סטטיסטיקות וציטוטים אמיתיים.
- מצטט רק כתובות ששמעת עליהן בתוצאות החיפוש. אסור להמציא כתובת, נתון או ציטוט.
- ציטוט ישיר חייב להופיע בפועל במקור. לא מצאת ציטוט אמיתי ממומחה? אל תכלול ציטוט, ואל תמציא.
- אין נתון בלי מקור. אין מקור בלי קישור.
- לעולם לא מעתיק ניסוחים ממקורות. מנסח כל רעיון מחדש במילים שלך. ציטוט ישיר רק קצר, במירכאות, עם שם המקור.
- נתון שוק אחד לכל נושא, עם מקור. אם שני מקורות סותרים, בוחר את המהימן יותר ומשאיר רק אותו.
- לא מזכיר חברות אחרות בשם כדי לקדם אותן. מקור שהוא חברה מצוטט רק כמקור לנתון.
- קול אחד לאורך כל המאמר, כמו כותב אחד. לא טלאים של משפטים ממקורות שונים.
- כל הגדרה מופיעה פעם אחת בלבד. אין חזרות, וחלק השאלות הנפוצות לא חוזר על הגוף.
- לא כותב שום טקסט לפני החיפוש או בין החיפושים. הפלט הסופי הוא המאמר בלבד, בפורמט Markdown, והוא מתחיל בכותרת ראשית אחת בשורה שמתחילה ב-"# ".
- אין מקפים ארוכים בטקסט. במקומם פסיק, נקודה או נקודתיים.

מבנה המאמר, בסדר הזה:
1. כותרת ראשית (H1).
2. פתיח של 2 עד 3 משפטים שעונה ישר על השאלה של הנושא, כמו שמנוע AI יצטט.
3. נקודות מפתח (Key Takeaways): 3 עד 5 בולטים.
4. תוכן עניינים: רשימה של כותרות המשנה.
5. גוף המאמר: כותרות משנה (H2) בצורת שאלות ברורות, ובכל חלק דוגמה אחת לפחות, או תרחיש מקורי מעולם הלקוח של החברה (מסומן במפורש כתרחיש ולא כנתון).
6. שאלות נפוצות קצר, עם שאלות חדשות.
7. סיכום קצר וקריאה לפעולה שמחברת את הנושא לחברה, בלי לחץ מכירתי.`;
}

export function buildEditSystem(): string {
  return `אתה עורך ראשי של תוכן SEO ו-GEO. אתה מקבל טיוטת מאמר ומחזיר אותה אחרי עריכה קפדנית. אתה לא כותב מחדש מאפס, ולא מוסיף מקורות או נתונים חדשים.`;
}

export function buildEditPrompt(company: Company, topic: string, draft: string): string {
  const p = company.profile;
  const competitors = p?.competitors?.length ? p.competitors.join(", ") : "אין";
  return `ערוך את הטיוטה הבאה על הנושא "${topic}" של החברה ${company.name}.

בדוק ותקן, לפי הרשימה:
1. סתירות: אם יש שני נתונים שסותרים זה את זה, השאר רק אחד, המהימן, עם הקישור שלו.
2. חזרתיות: כל הגדרה פעם אחת. חלק השאלות הנפוצות לא חוזר על הגוף.
3. מתחרים וחברות אחרות: הסר אזכור בשם של כל חברה שאינה ${company.name}, אלא אם היא מקור לנתון מצוטט. מתחרים שאסור להזכיר: ${competitors}.
4. ניסוחים מועתקים: משפט שנשמע כמו הגדרה מוכנה מוויקיפדיה או מבלוג של ספק, נסח מחדש במילים שלך. ציטוט ישיר נשאר רק אם הוא קצר ובמירכאות.
5. קול אחד: אחד הסגנון והטון בכל המאמר.${p?.tone ? ` טון המותג: ${p.tone}.` : ""}
6. מסר מיצוב: ${p?.positioning ? `המאמר צריך להעביר: ${p.positioning}.` : "לא הוגדר מסר מיצוב. אל תמציא מסר שלא מופיע בפרטי החברה."}
7. מבנה: חייבים להיות נקודות מפתח, תוכן עניינים, כותרות בצורת שאלה, שאלות נפוצות וקריאה לפעולה בסוף. השלם מה שחסר.
8. אין מקפים ארוכים בטקסט. במקומם פסיק, נקודה או נקודתיים.

כללי ברזל:
- שמור כל קישור קיים בדיוק כפי שהוא. אל תוסיף קישורים, נתונים או ציטוטים חדשים.
- אל תשנה עובדה שיש לה מקור, חוץ מהסרה בגלל סתירה.
- החזר רק את המאמר המלא ב-Markdown, מתחיל בשורת "# ". בלי הסברים.

הטיוטה:

${draft}`;
}

export function buildPrompt(company: Company, topic: string, words = TARGET_WORDS): string {
  const p = company.profile;
  const lines = [
    `כתוב מאמר על הנושא: ${topic}`,
    `אורך: כ-${words} מילים.`,
    "",
    "פרטי המותג (חובה לכתוב בקולו):",
    `שם החברה: ${company.name}`,
    `אתר: ${company.website}`,
  ];
  if (p) {
    if (p.summary) lines.push(`על החברה: ${p.summary}`);
    if (p.audience) lines.push(`קהל יעד: ${p.audience}`);
    if (p.tone) lines.push(`טון דיבור: ${p.tone}`);
    lines.push(`שפת המאמר: ${p.language || "עברית"}`);
    if (p.products.length) lines.push(`מוצרים ושירותים: ${p.products.join(", ")}`);
    if (p.avoid.length) lines.push(`מונחים שאסור להשתמש בהם: ${p.avoid.join(", ")}`);
    if (p.positioning) lines.push(`מסר המיצוב שהמאמר צריך להעביר: ${p.positioning}`);
    if (p.competitors?.length)
      lines.push(`חברות שאסור להזכיר בשם: ${p.competitors.join(", ")}`);
  } else {
    lines.push("שפת המאמר: עברית");
  }
  if (company.notes) lines.push(`הערות על המותג: ${company.notes.slice(0, 2000)}`);
  lines.push(
    "",
    "אל תמציא עובדות על החברה. הזכר אותה רק במקומות טבעיים, ולא כפרסומת."
  );
  return lines.join("\n");
}

// כתובת בצורה אחידה להשוואה: בלי #, בלי פרמטרי מעקב, בלי / בסוף
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    [...u.searchParams.keys()]
      .filter((k) => k.startsWith("utm_"))
      .forEach((k) => u.searchParams.delete(k));
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.hostname.replace(/^www\./, "")}${path}${u.search}`.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function extractLinks(markdown: string): string[] {
  return [...markdown.matchAll(LINK_RE)].map((m) => m[2]);
}

function isPublicHost(raw: string): boolean {
  try {
    const h = new URL(raw).hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.includes(":")) return false;
    return h.includes(".");
  } catch {
    return false;
  }
}

// בודק שהקישורים חיים. חסימות בוטים (401, 403, 405, 429) נחשבות חיות.
export async function checkLinks(urls: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  await Promise.all(
    urls.map(async (url) => {
      if (!isPublicHost(url)) {
        result.set(url, false);
        return;
      }
      const opts = {
        redirect: "follow" as const,
        signal: AbortSignal.timeout(7000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)" },
      };
      try {
        let r = await fetch(url, { ...opts, method: "HEAD" });
        if (r.status === 404 || r.status === 405 || r.status >= 500) {
          r = await fetch(url, { ...opts, method: "GET" });
        }
        result.set(url, r.status < 400 || [401, 403, 405, 429].includes(r.status));
      } catch {
        result.set(url, false);
      }
    })
  );
  return result;
}

export type ProcessedArticle = {
  title: string;
  content: string;
  sources: Array<{ url: string; title: string }>;
  words: number;
  notes: string[];
};

// מנקה את הטקסט: קישור שלא הגיע מהחיפוש, או שלא חי, מוסר ונשאר רק הטקסט שלו.
// מקף ארוך הופך לפסיק, ומקף בינוני בין מספרים הופך למקף רגיל
export function cleanDashes(text: string): string {
  return text
    .replace(/(\d)\s*–\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ");
}

export async function processArticle(
  rawText: string,
  found: Array<{ url: string; title: string }>,
  competitors: string[] = []
): Promise<ProcessedArticle> {
  const start = rawText.search(/^# /m);
  let content = cleanDashes(start >= 0 ? rawText.slice(start) : rawText);

  const foundMap = new Map(found.map((s) => [normalizeUrl(s.url), s]));
  const cited = [...new Set(extractLinks(content))];
  const fromSearch = cited.filter((u) => foundMap.has(normalizeUrl(u)));
  const invented = cited.filter((u) => !foundMap.has(normalizeUrl(u)));

  const live = await checkLinks(fromSearch);
  const dead = fromSearch.filter((u) => !live.get(u));
  const remove = new Set([...invented, ...dead]);

  content = content.replace(LINK_RE, (full, text: string, url: string) =>
    remove.has(url) ? text : full
  );

  const sources = fromSearch
    .filter((u) => live.get(u))
    .map((u) => ({ url: u, title: foundMap.get(normalizeUrl(u))!.title }));

  const notes: string[] = [];
  const many = (n: number) => (n === 1 ? "הוסר קישור אחד" : `הוסרו ${n} קישורים`);
  if (invented.length)
    notes.push(`${many(invented.length)} שלא הופיעו בחיפוש. כדאי לבדוק את הטענות שלידם.`);
  if (dead.length)
    notes.push(`${many(dead.length)} שלא נפתחים. כדאי להחליף במקור אחר.`);
  const plain = content.replace(LINK_RE, "$1").toLowerCase();
  for (const c of competitors) {
    if (c.trim() && plain.includes(c.trim().toLowerCase()))
      notes.push(`המאמר מזכיר את "${c.trim()}", שהוגדר כמתחרה. הסירו את האזכור לפני פרסום.`);
  }
  if (sources.length === 0)
    notes.push("אין במאמר אף מקור מאומת. הוסיפו מקורות לפני פרסום.");

  const title = content.match(/^# (.+)$/m)?.[1].trim() ?? "מאמר ללא כותרת";
  const words = content.replace(LINK_RE, "$1").split(/\s+/).filter(Boolean).length;

  return { title, content, sources, words, notes };
}
