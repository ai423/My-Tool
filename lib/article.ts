import type { Company } from "@/lib/company";
import type { Notes, Page, PageRef } from "@/lib/research";
import { isPublicUrl, normalizeUrl } from "@/lib/web";

// כתיבת מאמר: פרומפטים, בדיקות איכות בקוד, וקליטת התוצאה.

export const MAX_WORDS = 1400;

// ---------- פרומפטים ----------

// כללים משותפים לכתיבה חופשית ולכתיבה לפי בריף
export const FACTS_AND_COMPANY = `מקור העובדות:
- אתה מקבל פתקי מחקר מאומתים, כל אחד עם כתובת מקור. זה חומר הגלם היחיד שלך לעובדות, לנתונים ולציטוטים.
- כל עובדה, נתון או ציטוט נתמכים בקישור למקור שלהם בתוך הטקסט, בפורמט [טקסט](כתובת), עם הכתובת בדיוק כפי שהיא בפתק.
- אסור מספר שלא מופיע בפתקים. אסור להוסיף נתון מהידע שלך. דוגמה חשבונית מותרת רק אם היא מסומנת במפורש כדוגמה (למשל "לדוגמה, אם...").
- הסבר מושגי כללי (איך משהו עובד, הגדרה כללית, השוואה בין גישות, דוגמה) מותר בלי קישור, בתנאי שאין בו נתון, ציטוט, שם של ארגון או ייחוס למקור. ייחוס, נתון, ציטוט וטענה ספציפית על ארגון, מחקר או מוצר דורשים קישור.
- ציטוט ישיר של אדם רק מתוך הפתקים, מילה במילה, עם שם ותפקיד. אין ציטוטים בפתקים? אל תכלול ציטוט, ואל תמציא.
- אתה לא רואה את הטקסט של המקורות, ולכן אתה לא יכול להעתיק אותו. נסח כל רעיון במילים שלך, בקול אחד, כמו כותב אחד.
- פתקים עם scope "vendor" מתארים מוצר או מונח של יצרן מסוים. אל תציג אותם כהגדרה כללית של הנושא. השתמש בהם רק כדוגמה, בשם היצרן ("אצל Zendesk, למשל..."), ורק אם הם מועילים לקורא של החברה.
- בנה את ההגדרה והחלקים הכלליים מפתקי scope "general". אם יש מעט מהם, כתוב פחות ובמדויק, ולא תמלא בתיעוד של יצרנים.

הטענות על החברה:
- אתה מתאר את החברה רק לפי רשימת העובדות המאושרות ופרטי המותג שקיבלת. אל תייחס לה יכולת, מוצר, נתון או לקוח שלא מופיעים שם.
- כל משפט על יכולת או גישה של החברה מקושר לעמוד המקור של העובדה, בדיוק לפי הכתובת שבסוגריים ברשימה.
- נושא המאמר שונה מהגישה של החברה או לא מופיע ברשימה? תאר את הקטגוריה בניטרליות. אפשר לציין מה הגישה של החברה, רק אם היא כתובה בעובדות, ואסור לטעון שהחברה מספקת את הנושא.
- אל תזכיר חברות אחרות בשם כדי לקדם אותן. חברה מצוטטת רק כמקור לנתון או להגדרה.`;

export function buildSystem(): string {
  return `אתה כותב תוכן מקצועי ל-SEO ול-GEO (אופטימיזציה למנועי AI). אתה כותב מאמרים שמנועי חיפוש ומודלי שפה מצטטים, ושעומדים בבדיקה של עורך קפדן.

${FACTS_AND_COMPANY}

סגנון:
- שפה מקצועית, ברורה, בלי היסוס, לפי E-E-A-T. משפטים קצרים, פסקאות קצרות, רשימות איפה שמתאים, טבלה כשהיא עוזרת להשוות.
- מילת המפתח המרכזית בכותרת הראשית ובפסקה הראשונה, ואחר כך בטבעיות, בלי דחיסה. מילות מפתח משניות פעם או פעמיים.
- כל הגדרה פעם אחת בלבד. אין חזרות, וחלק השאלות הנפוצות לא חוזר על הגוף.
- אין מקפים ארוכים בטקסט. במקומם פסיק, נקודה או נקודתיים.
- אם בבקשה יש בריף, הוא גובר על כל כלל כללי כאן.
- כל חלק עם כותרת H2 מכיל הסבר מושגי ברור או עובדה מקושרת. אין חלק שהוא רק טענות עובדתיות בלי מקור.

מבנה, בסדר הזה:
1. כותרת ראשית (H1) אחת, בשורה שמתחילה ב-"# ".
2. פתיח של שתי פסקאות קצרות שעונות ישר על השאלה של הנושא, כמו שמנוע AI יצטט.
3. נקודות מפתח (Key Takeaways): 4 עד 5 בולטים.
4. גוף המאמר: כותרות משנה (H2, ובמידת הצורך H3) ברורות. בחלקים מתאימים דוגמה או תרחיש מעולם הלקוח של החברה, מסומן כתרחיש ולא כנתון.
5. שאלות נפוצות: 4 עד 5 שאלות חדשות, עם תשובות מהותיות.
6. סגירה: משפט וקריאה לפעולה אחת עם קישור לאתר החברה, בלי לחץ מכירתי.

הפלט הוא המאמר בלבד, ב-Markdown, בלי הסברים לפניו או אחריו.`;
}

// פרטי המותג, משותפים לכתיבה חופשית ולכתיבה לפי בריף
export function companyLines(company: Company): string[] {
  const p = company.profile;
  const lines = [
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
    if (p.competitors?.length) lines.push(`חברות שאסור להזכיר בשם: ${p.competitors.join(", ")}`);
  } else {
    lines.push("שפת המאמר: עברית");
  }
  if (company.notes) lines.push(`הערות על המותג: ${company.notes.slice(0, 2000)}`);
  const facts = p?.facts ?? [];
  if (facts.length) {
    lines.push(
      "עובדות מאושרות על החברה. כל טענה על החברה מבוססת רק עליהן, ומקושרת לכתובת שבסוגריים:",
      ...facts.map((f) => `- ${f.claim}${f.url ? ` (${f.url})` : ""}`)
    );
  } else {
    lines.push("אין עובדות מאושרות על החברה. אל תטען עליה דבר מעבר לתיאור ולמוצרים שלמעלה.");
  }
  return lines;
}

export function buildPrompt(company: Company, topic: string, notes: Notes): string {
  return [
    `כתוב מאמר על הנושא: ${topic}`,
    `אורך: בין 1,100 ל-${MAX_WORDS} מילים. אל תחרוג.`,
    "",
    ...companyLines(company),
    "",
    "פתקי המחקר המאומתים (JSON). זה כל מה שמותר לך להשתמש בו כעובדות, נתונים וציטוטים:",
    JSON.stringify(notes, null, 1),
  ].join("\n");
}

export function buildEditSystem(): string {
  return `אתה עורך ראשי של תוכן SEO ו-GEO. אתה מקבל טיוטת מאמר ורשימת בעיות שנמצאו בבדיקה אוטומטית, ומחזיר את המאמר אחרי עריכה קפדנית. אתה לא כותב מחדש מאפס, ולא מוסיף מקורות, נתונים או ציטוטים חדשים.`;
}

export type Issues = {
  unsourcedSections: string[];
  words: number;
  unsupported: Array<{ sentence: string; numbers: string[] }>;
  repeated: string[];
  copied: Array<{ sentence: string; url: string }>;
};

// בלוקים של בעיות לעורך. באורך: רק כשיש מגבלת אורך כללית (לא בבריף).
export function issueBlocks(issues: Issues, withLength = true): string[] {
  const found: string[] = [];
  if (withLength && issues.words > MAX_WORDS)
    found.push(
      `0. אורך: במאמר ${issues.words} מילים. קצר ל-${MAX_WORDS} מילים לכל היותר: מחק חזרות, פסקאות שוליות ודוגמאות מיותרות, ושמור על המבנה והקישורים.`
    );
  if (issues.unsourcedSections.length)
    found.push(
      `ד. חלקים בלי אף קישור למקור. הוסף עובדה עם קישור מהטקסט הקיים, או הפוך את החלק לתרחיש מסומן, או מחק טענות עובדתיות שאין להן מקור:\n${issues.unsourcedSections
        .map((t) => `- ${t}`)
        .join("\n")}`
    );
  if (issues.unsupported.length)
    found.push(
      `א. נתונים שלא נמצאים בפתקי המחקר. הסר כל מספר כזה, או נסח את המשפט בלי מספר, אלא אם זו דוגמה חשבונית שמסומנת כדוגמה:\n${issues.unsupported
        .map((u) => `- "${u.sentence}" (מספרים: ${u.numbers.join(", ")})`)
        .join("\n")}`
    );
  if (issues.repeated.length)
    found.push(
      `ב. ביטויים שחוזרים יותר מפעם אחת. השאר אחד, ונסח את השאר אחרת או מחק:\n${issues.repeated
        .map((r) => `- "${r}"`)
        .join("\n")}`
    );
  if (issues.copied.length)
    found.push(
      `ג. משפטים שדומים מדי לטקסט של מקור. נסח כל אחד מחדש לגמרי, בקול של המותג, בלי לשנות את העובדה ובלי לאבד את הקישור:\n${issues.copied
        .map((c) => `- "${c.sentence}"`)
        .join("\n")}`
    );
  return found;
}

// עובדות מאושרות לעורך
export function factsBlock(company: Company): string {
  const facts = company.profile?.facts ?? [];
  return facts.length
    ? `\nעובדות מאושרות על ${company.name}:\n${facts.map((f) => `- ${f.claim}${f.url ? ` (${f.url})` : ""}`).join("\n")}`
    : "";
}

export function buildEditPrompt(
  company: Company,
  topic: string,
  draft: string,
  issues: Issues
): string {
  const p = company.profile;
  const competitors = p?.competitors?.length ? p.competitors.join(", ") : "אין";
  const found = issueBlocks(issues);

  return `ערוך את הטיוטה הבאה על הנושא "${topic}" של החברה ${company.name}.

${found.length ? `בעיות שנמצאו בבדיקה אוטומטית, תקן כל אחת:\n${found.join("\n\n")}\n\n` : ""}בדוק ותקן גם, לפי הרשימה:
1. סתירות: אם שני נתונים סותרים, השאר רק את המהימן, עם הקישור שלו.
2. חזרתיות: כל הגדרה פעם אחת. חלק השאלות הנפוצות לא חוזר על הגוף.
3. חברות אחרות: הסר אזכור בשם של כל חברה שאינה ${company.name}, אלא אם היא מקור לנתון מצוטט. מתחרים שאסור להזכיר: ${competitors}.
4. טענות על ${company.name}: השאר רק מה שמתאים לעובדות המאושרות ולפרטי החברה. טענה על יכולת שלא כתובה שם, הסר או הפוך לתיאור ניטרלי של הקטגוריה. משפט על יכולת של החברה מקושר לעמוד המקור של העובדה.${p?.summary ? `\nפרטי החברה: ${p.summary}` : ""}${p?.products?.length ? `\nמוצרים: ${p.products.join(", ")}` : ""}${factsBlock(company)}
5. קול אחד: אחד סגנון וטון בכל המאמר.${p?.tone ? ` טון המותג: ${p.tone}.` : ""}
6. מסר מיצוב: ${p?.positioning ? `המאמר צריך להעביר: ${p.positioning}.` : "לא הוגדר. אל תמציא מסר שלא מופיע בפרטי החברה."}
7. מבנה: כותרת ראשית, פתיח, נקודות מפתח, גוף עם כותרות, שאלות נפוצות חדשות, וסגירה עם קריאה לפעולה וקישור לאתר החברה. השלם מה שחסר.
8. אין מקפים ארוכים בטקסט. במקומם פסיק, נקודה או נקודתיים.

כללי ברזל:
- שמור כל קישור קיים בדיוק כפי שהוא. אל תוסיף קישורים, נתונים או ציטוטים חדשים.
- החזר רק את המאמר המלא ב-Markdown, מתחיל בשורת "# ". בלי הסברים.

הטיוטה:

${draft}`;
}

export function buildSeoPrompt(company: Company, topic: string, article: string): string {
  return `נושא: ${topic}
חברה: ${company.name}
שפת המאמר: ${company.profile?.language || "עברית"}

תחילת המאמר:
${article.slice(0, 3500)}

החזר JSON בלבד:
{"primaryKeyword":"מילת המפתח המרכזית, 2 עד 4 מילים, בשפת המאמר","seoTitle":"כותרת SEO עד 60 תווים, בשפת המאמר","metaDescription":"תיאור מטא עד 150 תווים, בשפת המאמר, עם מילת המפתח","slug":"כתובת באותיות לטיניות קטנות ומקפים, 3 עד 6 מילים"}`;
}

// ---------- ניקוי ----------

// מקף ארוך הופך לפסיק, ומקף בינוני בין מספרים הופך למקף רגיל
export function cleanDashes(text: string): string {
  return text.replace(/(\d)\s*–\s*(\d)/g, "$1-$2").replace(/\s*[—–]\s*/g, ", ");
}

// ---------- בדיקות איכות בקוד ----------

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
export const plainText = (md: string) => md.replace(LINK_RE, "$1");
export const plainWordCount = (md: string) => plainText(md).split(/\s+/).filter(Boolean).length;

const tokens = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

function shingles(words: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(" "));
  return out;
}

// משפטים לבדיקה: בלי כותרות ושורות טבלה
function sentencesOf(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((l) => !/^\s*(#|\|)/.test(l))
    .flatMap((l) => l.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/^[-*>\s]+/, "").trim())
    .filter(Boolean);
}

const ILLUSTRATIVE = /לדוגמה|נניח|תרחיש|דמיינו|for example|for instance|e\.g\.|suppose|imagine|if \d/i;

export function findUnsupported(
  content: string,
  allowedText: string
): Array<{ sentence: string; numbers: string[] }> {
  const allowed = allowedText.replace(/(\d),(\d)/g, "$1$2");
  const out: Array<{ sentence: string; numbers: string[] }> = [];
  for (const raw of sentencesOf(content)) {
    if (ILLUSTRATIVE.test(raw)) continue;
    const sentence = plainText(raw);
    const nums = (sentence.replace(/(\d),(\d)/g, "$1$2").match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => {
      const v = Number(n);
      if (Number.isInteger(v) && (v <= 10 || (v >= 1990 && v <= 2100))) return false;
      return !new RegExp(`(^|[^\\d.])${n.replace(".", "\\.")}([^\\d]|$)`).test(allowed);
    });
    if (nums.length) out.push({ sentence, numbers: [...new Set(nums)] });
  }
  return out.slice(0, 8);
}

export function findRepeated(content: string, n = 7): string[] {
  const words = tokens(content);
  const positions = new Map<string, number[]>();
  shingles(words, n).forEach((s, i) => positions.set(s, [...(positions.get(s) ?? []), i]));
  const starts = new Set<number>();
  for (const list of positions.values()) {
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++)
        if (list[b] - list[a] >= n) {
          starts.add(list[a]);
          starts.add(list[b]);
        }
  }
  const sorted = [...starts].sort((x, y) => x - y);
  const phrases: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    phrases.push(words.slice(sorted[i], sorted[j] + n).join(" "));
    i = j + 1;
  }
  return [...new Set(phrases)].slice(0, 5);
}

export function findCopied(
  content: string,
  pages: Page[],
  notes: Notes
): Array<{ sentence: string; url: string }> {
  const sets = pages.map((p) => ({ url: p.url, set: new Set(shingles(tokens(p.text), 6)) }));
  const quotes = notes.quotes.map((q) => tokens(q.text).join(" "));
  const out: Array<{ sentence: string; url: string }> = [];
  for (const raw of sentencesOf(content)) {
    const words = tokens(raw);
    if (words.length < 9) continue;
    if (quotes.some((q) => q && words.join(" ").includes(q))) continue;
    const sh = shingles(words, 6);
    let best = { ratio: 0, url: "" };
    for (const s of sets) {
      const ratio = sh.filter((x) => s.set.has(x)).length / sh.length;
      if (ratio > best.ratio) best = { ratio, url: s.url };
    }
    if (best.ratio >= 0.5) out.push({ sentence: plainText(raw), url: best.url });
  }
  return out.slice(0, 8);
}

// חלקי H2 עם גוף ארוך ובלי אף קישור. שאלות נפוצות ונקודות מפתח מדולגים.
export function findUnsourcedSections(content: string): string[] {
  const parts = content.split(/^## /m).slice(1);
  const out: string[] = [];
  for (const part of parts) {
    const [title, ...rest] = part.split("\n");
    if (/faq|frequently|שאלות נפוצות|key takeaways|נקודות מפתח|conclusion|סיכום/i.test(title)) continue;
    const body = rest.join("\n");
    if (plainText(body).split(/\s+/).filter(Boolean).length < 60) continue;
    if (!LINK_RE.test(body)) out.push(title.trim());
    LINK_RE.lastIndex = 0;
  }
  return out.slice(0, 5);
}

export function computeIssues(
  content: string,
  notes: Notes,
  pages: Page[],
  company: Company,
  topic: string
): Issues {
  const allowedText = [JSON.stringify(notes), JSON.stringify(company.profile ?? {}), company.notes ?? "", topic].join(" ");
  return {
    words: plainText(content).split(/\s+/).filter(Boolean).length,
    unsourcedSections: findUnsourcedSections(content),
    unsupported: findUnsupported(content, allowedText),
    repeated: findRepeated(content),
    copied: findCopied(content, pages, notes),
  };
}

export function issuesToNotes(issues: Issues): string[] {
  const out: string[] = [];
  if (issues.words > MAX_WORDS)
    out.push(`המאמר ארוך מהיעד: ${issues.words} מילים, והיעד עד ${MAX_WORDS}.`);
  if (issues.unsourcedSections.length)
    out.push(`חלקים בלי אף מקור: ${issues.unsourcedSections.map((t) => `"${t}"`).join(", ")}. הוסיפו מקור או קצרו.`);
  if (issues.unsupported.length)
    out.push(
      `נשארו ${issues.unsupported.length} משפטים עם נתון שלא נמצא במקורות שנקראו. אמתו או הסירו: ${issues.unsupported
        .map((u) => `"${u.sentence.slice(0, 90)}"`)
        .join(" | ")}`
    );
  if (issues.repeated.length)
    out.push(`נמצא ביטוי שחוזר במאמר: "${issues.repeated[0]}". כדאי לקצר.`);
  if (issues.copied.length)
    out.push(
      `${issues.copied.length} משפטים דומים מאוד לטקסט במקור (למשל ${issues.copied[0].url}). נסחו מחדש לפני פרסום.`
    );
  return out;
}

// משפטים שמזכירים את החברה: אלה הטענות שצריך לאשר מול הלקוח
export function companyClaims(content: string, company: Company): string[] {
  let host = "";
  try {
    host = new URL(company.website.startsWith("http") ? company.website : `https://${company.website}`).hostname
      .replace(/^www\./, "")
      .split(".")[0];
  } catch {
    // בלי כתובת תקינה, בודקים רק לפי השם
  }
  const names = [company.name, host].map((n) => n.toLowerCase()).filter((n) => n.length >= 3);
  const out = sentencesOf(content)
    .map(plainText)
    .filter((s) => names.some((n) => s.toLowerCase().includes(n)));
  return [...new Set(out)].slice(0, 12);
}

export function countKeyword(content: string, keyword: string): number {
  const k = keyword.trim().toLowerCase();
  if (!k) return 0;
  return plainText(content).toLowerCase().split(k).length - 1;
}

export type Seo = {
  primaryKeyword: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  keywordCount: number;
};

export function finalizeSeo(raw: string, content: string): Seo | null {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s < 0 || e < 0) return null;
  try {
    const j = JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>;
    let meta = String(j.metaDescription ?? "").trim();
    if (meta.length > 150) meta = meta.slice(0, 147).replace(/\s+\S*$/, "") + "...";
    const keyword = String(j.primaryKeyword ?? "").trim();
    return {
      primaryKeyword: keyword,
      seoTitle: String(j.seoTitle ?? "").trim(),
      metaDescription: meta,
      slug: String(j.slug ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      keywordCount: countKeyword(content, keyword),
    };
  } catch {
    return null;
  }
}

// ---------- בדיקת קישורים וקליטת התוצאה ----------

export function extractLinks(markdown: string): string[] {
  return [...markdown.matchAll(LINK_RE)].map((m) => m[2]);
}

// בודק שהקישורים חיים. חסימות בוטים (401, 403, 405, 429) נחשבות חיות.
export async function checkLinks(urls: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  await Promise.all(
    urls.map(async (url) => {
      if (!isPublicUrl(url)) {
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

// מנקה את הטקסט: קישור שלא הגיע ממקורות שנקראו, או שלא חי, מוסר ונשאר רק הטקסט שלו.
// כתובת של החברה עצמה (קישור פנימי או קריאה לפעולה) מותרת.
export async function processArticle(
  rawText: string,
  found: PageRef[],
  competitors: string[] = [],
  ownSite = "",
  ownAllowed?: string[]
): Promise<ProcessedArticle> {
  const start = rawText.search(/^# /m);
  let content = cleanDashes(start >= 0 ? rawText.slice(start) : rawText);

  const foundMap = new Map(found.map((s) => [normalizeUrl(s.url), s]));
  const ownHost = (() => {
    try {
      return new URL(ownSite.startsWith("http") ? ownSite : `https://${ownSite}`).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const isOwn = (u: string) => {
    try {
      return ownHost !== "" && new URL(u).hostname.replace(/^www\./, "") === ownHost;
    } catch {
      return false;
    }
  };

  const cited = [...new Set(extractLinks(content))];
  const own = cited.filter(isOwn);
  const fromSources = cited.filter((u) => !isOwn(u) && foundMap.has(normalizeUrl(u)));
  const invented = cited.filter((u) => !isOwn(u) && !foundMap.has(normalizeUrl(u)));
  // בבריף מותרים רק הקישורים הפנימיים שהבריף קבע
  const ownList = ownAllowed ? new Set(ownAllowed.map(normalizeUrl)) : null;
  const strayOwn = ownList ? own.filter((u) => !ownList.has(normalizeUrl(u))) : [];

  const live = await checkLinks(fromSources);
  const dead = fromSources.filter((u) => !live.get(u));
  const remove = new Set([...invented, ...dead, ...strayOwn]);

  content = content.replace(LINK_RE, (full, text: string, url: string) =>
    remove.has(url) ? text : full
  );

  const sources = fromSources
    .filter((u) => live.get(u))
    .map((u) => ({ url: u, title: foundMap.get(normalizeUrl(u))!.title }));

  const notes: string[] = [];
  const many = (n: number) => (n === 1 ? "הוסר קישור אחד" : `הוסרו ${n} קישורים`);
  if (invented.length)
    notes.push(`${many(invented.length)} שלא הגיעו מהמקורות שנקראו. כדאי לבדוק את הטענות שלידם.`);
  if (dead.length) notes.push(`${many(dead.length)} שלא נפתחים. כדאי להחליף במקור אחר.`);
  if (strayOwn.length) notes.push(`${many(strayOwn.length)} פנימיים שלא מופיעים בבריף.`);

  const plain = plainText(content).toLowerCase();
  for (const c of competitors) {
    if (c.trim() && plain.includes(c.trim().toLowerCase()))
      notes.push(`המאמר מזכיר את "${c.trim()}", שהוגדר כמתחרה. הסירו את האזכור לפני פרסום.`);
  }
  if (sources.length === 0) notes.push("אין במאמר אף מקור מאומת. הוסיפו מקורות לפני פרסום.");

  const title = content.match(/^# (.+)$/m)?.[1].trim() ?? "מאמר ללא כותרת";
  const words = plainText(content).split(/\s+/).filter(Boolean).length;

  return { title, content, sources, words, notes };
}
