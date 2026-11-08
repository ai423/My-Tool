"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toolConfig } from "@/tool.config";

function LoginInner() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const message = params.get("denied")
    ? `הכלי פתוח רק ל-${toolConfig.adminEmail}. התחברו עם החשבון הזה.`
    : params.get("error")
      ? "ההתחברות לא הושלמה. נסו שוב."
      : err;

  async function signIn() {
    setBusy(true);
    setErr("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErr("לא הצלחתי לפתוח את ההתחברות עם Google. בדקו שהספק מופעל ב-Supabase.");
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>{toolConfig.toolName}</h1>
      <section className="card">
        <p style={{ color: "var(--ink-2)" }}>כניסה למנהל המערכת.</p>
        <button className="btn" onClick={signIn} disabled={busy}>
          {busy ? "פותח את Google..." : "כניסה עם Google"}
        </button>
        {message && <span className="status bad" role="alert">{message}</span>}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
