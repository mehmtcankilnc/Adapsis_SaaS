import { createClient } from "@supabase/supabase-js";

/**
 * Admin-seviyesi Supabase istemcisi.
 * Service Role Key kullanarak RLS bypass eder ve auth.admin API'lerine erişir.
 * SADECE Server Action'lar içinde, admin rolü doğrulanmış kullanıcılar tarafından çağrılmalıdır.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY ortam değişkeni tanımlı değil. " +
        ".env.local dosyanıza Supabase Dashboard → Settings → API → service_role key değerini ekleyin.",
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
