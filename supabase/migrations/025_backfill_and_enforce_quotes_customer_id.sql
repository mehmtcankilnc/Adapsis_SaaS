-- =============================================
-- FIX: quotes.customer_id zorunlu hale getiriliyor + eski kayıtlar eşleştiriliyor
-- =============================================
-- quotes.customer_id kolonu (hiçbir migration dosyasında tanımlı değildi,
-- muhtemelen customers/global_settings gibi elle eklenmişti) nullable'dı ve
-- mevcut kayıtların çoğunda boştu — sadece serbest metin customer_company
-- vardı. Bu, "Müşteri ↔ Teklif ilişkisi zayıf" CRM eksikliğinin kök nedeniydi.
--
-- Analiz: DB'deki tüm quotes satırları arasında customer_id'si boş olanların
-- hepsi customer_company alanında geliştirme sırasında girilmiş anlamsız test
-- metinleri içeriyordu ("kdfjs", "asdads", "qweas" vb.) — hiçbiri gerçek bir
-- customers kaydıyla eşleşmiyordu. Bu yüzden gerçek bir müşteriyle
-- eşleştirmek yerine, tek bir placeholder müşteriye bağlanıyor: veri
-- kaybı olmaz, teklifler erişilebilir kalır, gerçek müşteri listesi
-- anlamsız kayıtlarla kirlenmez.

DO $$
DECLARE
  placeholder_id UUID;
BEGIN
  -- Placeholder zaten oluşturulmuşsa (migration ikinci kez çalıştırılırsa) tekrar eklenmez.
  SELECT id INTO placeholder_id
  FROM public.customers
  WHERE company_name = '— Eşleştirilmemiş Eski Kayıt —'
  LIMIT 1;

  IF placeholder_id IS NULL THEN
    INSERT INTO public.customers (company_name, status, notes)
    VALUES (
      '— Eşleştirilmemiş Eski Kayıt —',
      'inactive',
      'quotes.customer_id backfill migration''ı (025) tarafından otomatik oluşturulmuş placeholder. Gerçek bir firma değildir; customer_id''si boş, eşleştirilemeyen eski test tekliflerini toplamak için kullanılır. customer_company alanındaki orijinal serbest metin, ilgili teklif kaydında korunmuştur.'
    )
    RETURNING id INTO placeholder_id;
  END IF;

  UPDATE public.quotes
  SET customer_id = placeholder_id
  WHERE customer_id IS NULL;
END $$;

-- Bundan sonra her teklif bir müşteriye bağlı olmak zorunda (uygulama
-- kodu — quote.actions.ts createQuoteAction — zaten customer_id'yi
-- zorunlu tutuyordu; bu DB seviyesinde de garanti altına alınıyor).
ALTER TABLE public.quotes ALTER COLUMN customer_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotes_customer_id_fkey'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
