-- =============================================
-- Teklif otomatik takip süresi (gün)
-- =============================================
-- Bir teklif müşteriye gönderilip "pending" durumuna geçtiğinde, satış
-- temsilcisi için otomatik bir takip görevi oluşturulur (bkz.
-- quote-followup.actions.ts). Bu görevin vade tarihi, burada tanımlı gün
-- sayısı kadar ileri atılır. Admin, Ayarlar sayfasından değiştirebilir.

ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS quote_followup_days INTEGER NOT NULL DEFAULT 3;
