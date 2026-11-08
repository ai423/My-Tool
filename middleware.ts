import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { toolConfig } from "@/tool.config";

// מרענן את הסשן, ומכניס רק את האדמין. כל השאר עובר ל-/login.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const allowed = data.user?.email === toolConfig.adminEmail;

  if (!allowed) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "אין הרשאה. צריך להתחבר." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = data.user ? "?denied=1" : "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!login|auth|_next/static|_next/image|favicon.ico).*)"],
};
