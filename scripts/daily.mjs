// הרצה יומית. מופעל על ידי .github/workflows/daily.yml (או ידנית: npm run daily).
// עד שלב 5 בסדנה זה רק שלד. Claude Code מחבר אותו למה שהכלי שלכם עושה.
//
// דפוס העבודה, אותו דפוס שמריץ בוטים בפרודקשן:
//   1. קורא מקור (קובץ, API, גיליון)
//   2. מחשב משהו (מסנן, מדרג, משווה לאתמול)
//   3. כותב תוצאה (קובץ בריפו, מייל, הודעה)
//   4. יוצא עם קוד 0 אם הצליח, אחרת קוד 1, כדי ש-GitHub יסמן כישלון

import { readFile } from "node:fs/promises";

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[daily] התחלה ${startedAt}`);

  // 1. קורא מקור. דוגמה: קובץ ההצעות.
  const csv = await readFile(new URL("../examples/quotes.csv", import.meta.url), "utf8");
  const rows = csv.trim().split("\n").slice(1);

  // 2. מחשב. דוגמה: כמה שורות יש.
  console.log(`[daily] נקראו ${rows.length} שורות`);

  // 3. כותב תוצאה. כאן: רק ללוג. בסדנה: מייל, קובץ, או הודעה.
  console.log("[daily] אין עדיין פעולה מוגדרת. ראו docs/PROMPTS.md, פרומפט 5.");

  console.log("[daily] סיום תקין");
}

main().catch((err) => {
  console.error("[daily] נכשל:", err instanceof Error ? err.message : err);
  process.exit(1);
});
