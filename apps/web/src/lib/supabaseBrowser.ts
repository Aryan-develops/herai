import { createClient } from "@supabase/supabase-js";

// The ONLY place apps/web talks to Supabase directly (see api.ts's header
// comment on why every other call goes through the gateway). Unavoidable
// here: a WebAuthn ceremony (navigator.credentials.create/get) must run in
// the browser against the page's own origin — there's no way to proxy it
// through a server. The anon key is safe client-side by design; this client
// never persists a session or auto-refreshes, because the resulting
// access/refresh tokens are handed off to lib/session.ts immediately and
// treated exactly like a password-login session from then on.
export const supabaseBrowser = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      experimental: { passkey: true },
    },
  }
);
