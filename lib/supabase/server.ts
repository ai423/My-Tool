import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// שרת בלבד. מחזיר לקוח Supabase עם הסשן של המשתמש מה-cookies.
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // נקרא מ-server component: הרענון נעשה ב-middleware.
          }
        },
      },
    }
  );
}
