"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── Guard: Sadece admin kullanıcılar çağırabilir ───
async function assertAdmin() {
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

// ─── Kullanıcı Listesi ───
export async function listUsersAction() {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    // profiles tablosundan tüm kullanıcıları çek
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name", { ascending: true });

    if (error) throw error;

    // auth.users'tan e-posta bilgilerini al
    const {
      data: { users: authUsers },
      error: authError,
    } = await admin.auth.admin.listUsers({ perPage: 500 });

    if (authError) throw authError;

    // İki kaynağı birleştir
    const merged = (profiles || []).map((p) => {
      const authUser = authUsers?.find((u) => u.id === p.id);
      return {
        id: p.id,
        full_name: p.full_name || "İsimsiz",
        email: authUser?.email || "—",
        role: p.role,
        created_at: authUser?.created_at || null,
      };
    });

    return { success: true, users: merged };
  } catch (error: any) {
    console.error("listUsersAction hatası:", error);
    return { success: false, error: error.message, users: [] };
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
    await assertAdmin();

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
  } catch (error: any) {
    console.error("createUserAction hatası:", error);
    return { success: false, error: error.message };
  }
}

// ─── Kullanıcı Güncelleme (İsim / Rol) ───
export async function updateUserAction(
  userId: string,
  data: { full_name?: string; role?: "admin" | "sales" },
) {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    // profiles tablosunu güncelle
    const updateData: Record<string, string> = {};
    if (data.full_name !== undefined) updateData.full_name = data.full_name.trim();
    if (data.role !== undefined) updateData.role = data.role;

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "Güncelleme verisi bulunamadı." };
    }

    const { error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

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
  } catch (error: any) {
    console.error("updateUserAction hatası:", error);
    return { success: false, error: error.message };
  }
}

// ─── Kullanıcı Silme ───
export async function deleteUserAction(userId: string) {
  try {
    const currentAdmin = await assertAdmin();

    // Kendini silemesin
    if (currentAdmin.id === userId) {
      return { success: false, error: "Kendi hesabınızı silemezsiniz." };
    }

    const admin = createAdminClient();

    // auth.admin üzerinden sil — CASCADE ile profiles da silinir
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) throw error;

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error: any) {
    console.error("deleteUserAction hatası:", error);
    return { success: false, error: error.message };
  }
}
