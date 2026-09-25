"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

// ─── Kullanıcı Listesi ───
export async function listUsersAction() {
  try {
    const { organizationId } = await assertAdmin();
    const admin = createAdminClient();

    // profiles tablosundan sadece bu organizasyonun kullanıcılarını çek
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, full_name, role, commission_rate")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true });

    if (error) throw error;

    // auth.users'tan e-posta bilgilerini al — listUsers org'a göre filtrelenemediği
    // için tüm kullanıcılar çekilip yukarıdaki (zaten org'a filtrelenmiş) profiles
    // listesindeki id'lerle eşleştiriliyor (aşağıdaki .find), böylece başka bir
    // organizasyonun kullanıcısı asla sonuca sızmıyor.
    const {
      data: { users: authUsers },
      error: authError,
    } = await admin.auth.admin.listUsers({ perPage: 500 });

    if (authError) throw authError;

    // Bu ayın kota hedeflerini çek (sadece sales rolündeki kullanıcılar için anlamlı)
    const now = new Date();
    const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: targets } = await admin
      .from("sales_targets")
      .select("profile_id, target_amount, target_currency")
      .eq("organization_id", organizationId)
      .eq("period_month", periodMonth);
    const targetMap = new Map((targets || []).map((t) => [t.profile_id, t]));

    // Kaynakları birleştir
    const merged = (profiles || []).map((p) => {
      const authUser = authUsers?.find((u) => u.id === p.id);
      const target = targetMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name || "İsimsiz",
        email: authUser?.email || "—",
        role: p.role,
        created_at: authUser?.created_at || null,
        commission_rate: p.commission_rate || 0,
        target_amount: target?.target_amount || 0,
        target_currency: target?.target_currency || "USD",
      };
    });

    return { success: true, users: merged };
  } catch (error: unknown) {
    console.error("listUsersAction hatası:", error);
    return { success: false, error: getErrorMessage(error), users: [] };
  }
}

// ─── Yeni Kullanıcı Oluşturma ───
export async function createUserAction(data: {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "sales";
}) {
  try {
    const { organizationId } = await assertAdmin();

    // Validasyon
    if (!data.email || !data.email.includes("@")) {
      return { success: false, error: "Geçerli bir e-posta adresi girin." };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: "Şifre en az 6 karakter olmalıdır." };
    }
    if (!data.full_name || data.full_name.trim().length < 2) {
      return { success: false, error: "İsim en az 2 karakter olmalıdır." };
    }

    const admin = createAdminClient();

    // auth.admin ile kullanıcı oluştur — trigger otomatik olarak profiles'a da ekler
    const {
      data: { user: newUser },
      error,
    } = await admin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true, // E-posta doğrulamasını atla, admin oluşturuyor
      user_metadata: {
        full_name: data.full_name.trim(),
        role: data.role,
        organization_id: organizationId,
      },
    });

    if (error) {
      // Supabase hata mesajlarını Türkçeleştir
      if (error.message.includes("already been registered")) {
        return { success: false, error: "Bu e-posta adresi zaten kayıtlı." };
      }
      throw error;
    }

    revalidatePath("/admin/settings");
    return { success: true, userId: newUser?.id };
  } catch (error: unknown) {
    console.error("createUserAction hatası:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Kullanıcı Güncelleme (İsim / Rol) ───
export async function updateUserAction(
  userId: string,
  data: { full_name?: string; role?: "admin" | "sales" },
) {
  try {
    const { organizationId } = await assertAdmin();
    const admin = createAdminClient();

    // profiles tablosunu güncelle
    const updateData: Record<string, string> = {};
    if (data.full_name !== undefined) updateData.full_name = data.full_name.trim();
    if (data.role !== undefined) updateData.role = data.role;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "Güncelleme verisi bulunamadı." };
    }

    // admin client RLS'i bypass ettiği için organization_id kontrolünü burada
    // elle yapıyoruz — başka bir organizasyonun kullanıcısı güncellenemesin.
    const { error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .eq("organization_id", organizationId);

    if (error) throw error;

    // auth user_metadata'yı da güncelle (rol ve isim senkronize)
    const metaUpdate: Record<string, string> = {};
    if (data.full_name !== undefined) metaUpdate.full_name = data.full_name.trim();
    if (data.role !== undefined) metaUpdate.role = data.role;

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: metaUpdate,
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateUserAction hatası:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// ─── Kullanıcı Silme ───
export async function deleteUserAction(userId: string) {
  try {
    const { user: currentUser, organizationId } = await assertAdmin();

    // Kendini silemesin
    if (currentUser.id === userId) {
      return { success: false, error: "Kendi hesabınızı silemezsiniz." };
    }

    const admin = createAdminClient();

    // Başka bir organizasyonun kullanıcısı silinemesin (admin client RLS
    // bypass ettiği için bu kontrolü elle yapıyoruz).
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .maybeSingle();
    if (targetProfile?.organization_id !== organizationId) {
      return { success: false, error: "Bu kullanıcı bulunamadı." };
    }

    // auth.admin üzerinden sil — CASCADE ile profiles da silinir
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) throw error;

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteUserAction hatası:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
