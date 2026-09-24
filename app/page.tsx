import { toolConfig } from "@/tool.config";

// דף הבית של התבנית. בסדנה, Claude Code מחליף את התוכן כאן בכלי שלכם.
// עד אז הוא מראה שהפריסה עבדה, ומה הצעד הבא.

export default function Home() {
  const name = toolConfig.ownerName;
  const tool = toolConfig.toolName;

  return (
    <main className="container">
      <header style={{ display: "grid", gap: 8 }}>
        <span className="eyebrow">הלוואי שהיה אפשר · GR8MINDS</span>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 900 }}>
          {tool ? tool : <>הכלי של {name}</>}
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: "1.1rem" }}>
          {tool
            ? `נבנה על ידי ${name}`
            : "פרוס, חי, ומחכה לכרטיס האפיון."}
        </p>
        <span className="status ok" style={{ justifySelf: "start" }}>
          הפריסה עבדה
        </span>
      </header>

      <section className="card">
        <h2 style={{ fontSize: "1.2rem" }}>מה עכשיו</h2>
        <ol style={{ margin: 0, paddingInlineStart: 22, display: "grid", gap: 6, color: "var(--ink-2)" }}>
          <li>ממלאים את כרטיס האפיון בדף, ואז מעתיקים אותו לקובץ <code>SPEC.md</code> בריפו.</li>
          <li>ב-Claude Code שולחים את הפרומפט הראשון (נמצא ב-<code>docs/PROMPTS.md</code>).</li>
          <li>מאשרים את התוכנית, ממזגים את ה-PR, ובודקים כאן, בכתובת הזאת.</li>
        </ol>
      </section>

      <section className="card" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
        <h2 style={{ fontSize: "1.05rem" }}>הכלל שמחזיק את כל השאר</h2>
        <p style={{ color: "var(--ink-2)" }}>
          דבר אחד בכל בקשה. תוכנית לפני קוד. בודקים בכתובת, לא בקוד. כשמשהו נשבר, הלוג הוא הפרומפט.
        </p>
      </section>
    </main>
  );
}
