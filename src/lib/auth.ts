import { createClient } from "@/lib/supabase/server";

/**
 * Server action'ların başında çağrılır. Oturum yoksa veya kullanıcı admin
 * değilse hata fırlatır. RLS zaten bu işlemleri veritabanı seviyesinde
 * engeller, ancak burada da kontrol etmek anlamlı bir hata mesajı üretir ve
 * savunma katmanını (defense in depth) app kodunda da sağlar.
 */
export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Oturum bulunamadı.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Bu işlem için admin yetkisi gereklidir.");
  }

  return user;
}
