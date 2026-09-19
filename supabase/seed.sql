-- Test verisi: kategori, ürün, varyant (envanter bağlantılı), müşteri.
-- Stok rezervasyon trigger'ını gerçek bir akışla test etmek için envanteri
-- kasıtlı olarak DÜŞÜK tutuyoruz (Trafo: 2 adet) böylece "yetersiz stok"
-- happy-path/unhappy-path senaryosunu da tetikleyebiliriz.

insert into categories (id, name, slug, sort_order, is_active)
values ('11111111-1111-1111-1111-111111111111', 'Elektrik Panoları', 'elektrik-panolari', 1, true)
on conflict (id) do nothing;

insert into products (id, category_id, name, sku, description, base_price, base_currency, is_active)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Endüstriyel Güç Panosu',
  'EGP-100',
  'Test ürünü',
  1000.00,
  'USD',
  true
)
on conflict (id) do nothing;

-- Varyant: Trafo seçimi, stokta sadece 2 adet olan "Yüksek Akım Trafosu 50MVA" kalemine bağlı.
insert into product_variants (id, product_id, group_name, sort_order, is_required, options)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Trafo Tipi',
  0,
  true,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Standart Trafo (Stoksuz)',
      'value', 'standart',
      'price_effect', jsonb_build_object('type', 'fixed', 'amount', 0),
      'is_default', true
    ),
    jsonb_build_object(
      'label', '50MVA Yüksek Akım Trafosu',
      'value', 'yuksek-akim',
      'price_effect', jsonb_build_object('type', 'fixed', 'amount', 5000),
      'is_default', false,
      'inventory_item_id', (select id from inventory where sku = 'TR-50M'),
      'required_amount', 1
    )
  )
)
on conflict (id) do nothing;

insert into customers (id, company_name, contact_name, email)
values ('44444444-4444-4444-4444-444444444444', 'Test Müşteri A.Ş.', 'Ahmet Yılmaz', 'ahmet@test.com')
on conflict (id) do nothing;
