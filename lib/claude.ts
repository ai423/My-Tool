// עטיפה קטנה לקריאה ל-Claude מצד השרת.
// משתמשים בה רק אם הכלי צריך AI בזמן ריצה (סיווג, סיכום, ניסוח).
// רץ רק בשרת (route handlers / server components). לעולם לא מהדפדפן.

const DEFAULT_MODEL = "claude-sonnet-4-5";

export function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function askClaude(
  prompt: string,
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY לא מוגדר. הוסיפו אותו ב-Vercel תחת Settings > Environment Variables ופרסו מחדש."
    );
  }

  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 1024,
      system: options.system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n")
    .trim();
}

// ---------- חיפוש ברשת ----------
// קריאה ל-Claude עם כלי החיפוש של Anthropic. מחזירה את הטקסט הסופי,
// ואת כל כתובות האתרים שהחיפוש באמת החזיר. רק אותן מותר לצטט.

export type WebSource = { url: string; title: string };

type Block = {
  type: string;
  text?: string;
  content?: unknown;
};

export async function askClaudeWithSearch(
  prompt: string,
  options: { system?: string; maxTokens?: number; maxSearches?: number } = {}
): Promise<{ text: string; sources: WebSource[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY לא מוגדר. הוסיפו אותו ב-Vercel תחת Settings > Environment Variables ופרסו מחדש."
    );
  }
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: prompt },
  ];
  const blocks: Block[] = [];

  // חיפוש ארוך יכול להיעצר באמצע (pause_turn). ממשיכים עד שלוש פעמים.
  for (let turn = 0; turn < 4; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 8000,
        system: options.system,
        messages,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: options.maxSearches ?? 6,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as { content: Block[]; stop_reason: string };
    blocks.push(...data.content);
    if (data.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: data.content });
  }

  const sources: WebSource[] = [];
  let lastResultIndex = -1;
  blocks.forEach((b, i) => {
    if (b.type !== "web_search_tool_result") return;
    lastResultIndex = i;
    if (!Array.isArray(b.content)) return;
    for (const r of b.content as Array<{ type: string; url?: string; title?: string }>) {
      if (r.type === "web_search_result" && r.url) {
        sources.push({ url: r.url, title: r.title ?? r.url });
      }
    }
  });

  // הטקסט הסופי הוא מה שנכתב אחרי החיפוש האחרון. מה שלפני זה הוא הערות ביניים.
  const join = (list: Block[]) =>
    list
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  const text = join(blocks.slice(lastResultIndex + 1)) || join(blocks);

  return { text, sources };
}
