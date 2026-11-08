import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toolConfig } from "@/tool.config";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email === toolConfig.adminEmail) {
      return NextResponse.redirect(`${origin}/`);
    }
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?denied=1`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
