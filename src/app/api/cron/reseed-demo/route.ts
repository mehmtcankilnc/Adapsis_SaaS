import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils";
import { seedDemoData } from "../../../../../scripts/seed-demo.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro'da geçerli; Hobby planı 10sn'de kesiyor (bkz. README notu).

/**
 * Vercel Cron tarafından tetiklenir (bkz. vercel.json). Portfolyo demosunu
 * herkese açık paylaştığımız için, bir ziyaretçinin admin hesabıyla verileri
 * bozması/silmesi periyodik olarak kendiliğinden düzelsin diye demo verisini
 * sıfırdan (idempotent upsert ile) yeniden yükler.
 *
 * Vercel, proje ayarlarında CRON_SECRET tanımlıysa cron isteklerine otomatik
 * olarak `Authorization: Bearer $CRON_SECRET` header'ı ekler — burada bunu
 * doğrulayarak endpoint'in dışarıdan tetiklenmesini engelliyoruz.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    await seedDemoData(supabase);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Demo reseed cron hatası:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
