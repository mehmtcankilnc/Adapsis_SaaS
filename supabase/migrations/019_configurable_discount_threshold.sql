-- =============================================
-- Yapılandırılabilir iskonto onay eşiği
-- =============================================
-- Önceden ConfiguratorClient.tsx ve quote.actions.ts içinde %5 olarak sabit
-- kodlanmıştı. Artık admin, Ayarlar sayfasından bu eşiği değiştirebilir.

ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS discount_approval_threshold NUMERIC(5,2) NOT NULL DEFAULT 5;
