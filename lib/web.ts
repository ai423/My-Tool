// כלים משותפים לקריאת אתרים ברשת. שרת בלבד.

export function isPublicUrl(raw: string): URL | null {
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

export function htmlToPlain(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// גיבוי לעמודים שחוסמים קריאה אוטומטית או נטענים ב-JavaScript: Jina Reader.
// המפתח אופציונלי. בלעדיו השירות עובד במגבלות נמוכות יותר.
async function fetchViaJina(url: string, maxChars: number): Promise<string | null> {
  const key = process.env.JINA_API_KEY;
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { accept: "text/plain", ...(key ? { authorization: `Bearer ${key}` } : {}) },
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return null;
    const text = (await r.text()).replace(/\s+/g, " ").trim();
    return text.length < 300 ? null : text.slice(0, maxChars);
  } catch {
    return null;
  }
}

// טקסט נקי של עמוד. קודם קריאה ישירה, ואם נכשלה, דרך Jina Reader.
export async function fetchPageText(raw: string, maxChars = 60000): Promise<string | null> {
  const u = isPublicUrl(raw);
  if (!u) return null;
  return (await fetchDirect(u, maxChars)) ?? (await fetchViaJina(u.href, maxChars));
}

async function fetchDirect(u: URL, maxChars: number): Promise<string | null> {
  try {
    const r = await fetch(u, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(9000),
      redirect: "follow",
    });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") ?? "";
    if (!/html|text|xml/i.test(type)) return null;
    const plain = htmlToPlain((await r.text()).slice(0, 600000));
    return plain.length < 300 ? null : plain.slice(0, maxChars);
  } catch {
    return null;
  }
}
