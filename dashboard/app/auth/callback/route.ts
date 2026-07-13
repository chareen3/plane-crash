import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Handles Supabase auth redirects (email confirm, password recovery, magic link).
 * Exchange `code` for a session, then send the user to `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") || "/app";
  // Prevent open redirects
  const next = nextRaw.startsWith("/") ? nextRaw : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message || "Auth link invalid or expired")}`,
    );
  }

  // No code — maybe already has session (hash-based clients handle on page)
  return NextResponse.redirect(`${origin}${next}`);
}
