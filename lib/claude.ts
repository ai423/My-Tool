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
