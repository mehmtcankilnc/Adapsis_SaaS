"use server";

import { createClient } from "@/lib/supabase/server";
import { createTaskAction } from "@/actions/task.actions";

/**
 * Bir teklif müşteriye gönderilip (status='pending') yanıt beklemeye
 * girdiğinde, satış temsilcisi için otomatik bir takip görevi oluşturur.
 * `createQuoteAction` (normal akış) ve `approveDiscountAction` (iskonto
 * onayı sonrası pending'e dönüş) tarafından çağrılır.
 *
 * Not: `createTaskAction` görevin `created_by` alanını çağıran oturumdan
 * alır. Admin onayı sırasında çağrıldığında `created_by` onaylayan admin
 * olur, ancak `assigned_to` her zaman teklifi oluşturan temsilcidir — bu
 * RLS ile uyumludur (admin insert edebilir, görev doğru temsilciye atanır).
 */
export async function ensureQuoteFollowUpTask(quoteId: string) {
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, customer_id, created_by, customer_company, organization_id")
    .eq("id", quoteId)
    .single();
  if (!quote) return { success: false, error: "Teklif bulunamadı." };

  // Mükerrer önleme: bu teklif için açık (pending) herhangi bir görev
  // varsa (otomatik veya manuel), yeni bir takip görevi oluşturma.
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existing) return { success: true, skipped: true };

  const { data: settings } = await supabase
    .from("global_settings")
    .select("quote_followup_days")
    .eq("organization_id", quote.organization_id)
    .maybeSingle();
  const days = Number(settings?.quote_followup_days ?? 3);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);

  return createTaskAction({
    customer_id: quote.customer_id,
    quote_id: quote.id,
    title: `Teklif takibi: ${quote.customer_company || "Müşteri"}`,
    description: "Bu teklif müşteriye gönderildi, yanıt bekleniyor. Takip edin.",
    due_date: dueDate.toISOString(),
    assigned_to: quote.created_by ?? undefined,
  });
}
