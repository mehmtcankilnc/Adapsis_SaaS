import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface CurrentProfile {
  user: User;
  role: "admin" | "sales";
  organizationId: string;
}

/**
 * Sayfalarda ve server action'larda tekrarlanan "kullanıcı + rol + org"
 * çözümleme kalıbının tek merkezi hali. RLS zaten organization_id'yi
 * dolaylı olarak uygular, ama admin-client (service role) çağrıları ve
 * insert payload'ları organizationId'yi elle set etmek zorunda olduğu için
 * bu değer burada döndürülüyor.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return null;

  return { user, role: (profile.role as "admin" | "sales") || "sales", organizationId: profile.organization_id };
}

/**
 * Server action'ların başında çağrılır. Oturum yoksa veya kullanıcı admin
 * değilse hata fırlatır. RLS zaten bu işlemleri veritabanı seviyesinde
 * engeller, ancak burada da kontrol etmek anlamlı bir hata mesajı üretir ve
 * savunma katmanını (defense in depth) app kodunda da sağlar.
 */
export async function assertAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) throw new Error("Oturum bulunamadı.");
  if (profile.role !== "admin") {
    throw new Error("Bu işlem için admin yetkisi gereklidir.");
  }

  return profile;
}
