// Portfolyo/demo amaçlı: test admin hesabı + tüm modüllere zengin placeholder veri.
// Service Role key ile çalışır (RLS bypass), .env.local üzerinden okunur.
// Idempotent: sabit UUID'lerle upsert edilen tablolar tekrar çalıştırıldığında güncellenir;
// doğal FK'si olmayan tablolar (activities/tasks/opportunities/contacts/documents/
// quote_templates/system_requests/quotes) önce demo verisine göre temizlenip yeniden eklenir.

import { createClient } from '@supabase/supabase-js'
import { Agent, setGlobalDispatcher } from 'undici'
import fs from 'fs'

// Bu ortamda IPv6 bağlantı denemesi undici'nin 10sn connect timeout'una takılıp
// düzenli olarak başarısız oluyor; IPv4'e zorlamak bağlantıyı anında kuruyor.
setGlobalDispatcher(new Agent({ connect: { family: 4 } }))

const envContent = fs.readFileSync('.env.local', 'utf-8')
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)
const secretMatch = envContent.match(/SUPABASE_SECRET_KEY=([^\r\n]+)/)

const supabaseUrl = urlMatch ? urlMatch[1] : ''
const secretKey = secretMatch ? secretMatch[1] : ''

if (!supabaseUrl || !secretKey) {
  console.error('HATA: .env.local dosyasından NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY okunamadı!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function must(label, { data, error }) {
  if (error) {
    console.error(`HATA [${label}]:`, error.message)
    throw error
  }
  return data
}

// Supabase'e ilk bağlantı bazen (özellikle Windows'ta) birkaç saniye gecikmeli
// açılıyor ve undici'nin 10sn sabit connect timeout'una takılıyor; geçici ağ
// hatalarında birkaç kez tekrar dene.
async function withRetry(fn, { retries = 4, delayMs = 2000, label = 'call' } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      console.warn(`   (yeniden deneme ${attempt}/${retries}) ${label}: ${e.message}`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw lastErr
}

function daysAgo(n, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function daysFromNow(n, hour = 10) {
  return daysAgo(-n, hour)
}

function monthStart(offsetMonths = 0) {
  // toISOString() UTC'ye çevirdiği için yerel saat UTC+ ise ayın 1'i bir
  // önceki aya kayabiliyordu (örn. TR saatinde 1 Eylül 00:00 -> UTC'de
  // 31 Ağustos); tarih matematiğini yerel bileşenlerle elle yapıyoruz.
  const d = new Date()
  const totalMonths = d.getFullYear() * 12 + d.getMonth() + offsetMonths
  const year = Math.floor(totalMonths / 12)
  const month = ((totalMonths % 12) + 12) % 12
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

// categories.slug / products.sku / inventory.sku artık ORGANİZASYON BAŞINA
// unique (bkz. migration 033). Sabit UUID'lerle upsert etmeden önce, aynı
// organizasyon içinde doğal anahtara göre gerçek id'yi çözüyoruz — böylece
// script tekrar tekrar güvenle çalıştırılabilir ve yanlışlıkla başka bir
// organizasyonun satırını "ele geçirmez".
async function resolveIdsByKey(table, keyCol, rows, orgId) {
  const keys = rows.map((r) => r[keyCol])
  const { data } = await supabase.from(table).select(`id, ${keyCol}`).eq('organization_id', orgId).in(keyCol, keys)
  const byKey = Object.fromEntries((data || []).map((r) => [r[keyCol], r.id]))
  for (const r of rows) if (byKey[r[keyCol]]) r.id = byKey[r[keyCol]]
}

// "Adapsis Demo Portfolyo" organizasyonunu slug'a göre çözümler, yoksa
// oluşturur — böylece script tekrar çalıştırıldığında yeni bir organizasyon
// oluşturulmaz, hep aynısı güncellenir.
async function resolveOrCreateOrganization(name, slug) {
  const { data: existing } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle()
  if (existing) return existing.id
  const created = must('organizations insert', await supabase.from('organizations').insert({ name, slug }).select('id').single())
  return created.id
}

// ---------------------------------------------------------------------------
// 1) Demo kullanıcıları (admin + satış ekibi)
// ---------------------------------------------------------------------------

const DEMO_USERS = [
  { email: 'admin@adapsis.com', password: 'Portfolyo2026!', full_name: 'Adapsis Yönetim (Demo Admin)', role: 'admin', commission_rate: 0 },
  { email: 'satis@adapsis.com', password: 'Portfolyo2026!', full_name: 'Elif Yıldız', role: 'sales', commission_rate: 4 },
  { email: 'mehmet.satis@adapsis.com', password: 'Portfolyo2026!', full_name: 'Mehmet Aydın', role: 'sales', commission_rate: 3.5 },
  { email: 'zeynep.satis@adapsis.com', password: 'Portfolyo2026!', full_name: 'Zeynep Kaya', role: 'sales', commission_rate: 5 },
]

async function upsertAuthUser(u, orgId) {
  const { data: list } = await withRetry(() => supabase.auth.admin.listUsers({ page: 1, perPage: 200 }), {
    label: `listUsers (${u.email})`,
  })
  const existing = list?.users?.find((x) => x.email === u.email)

  let userId
  if (existing) {
    await withRetry(
      () =>
        supabase.auth.admin.updateUserById(existing.id, {
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.full_name, role: u.role, organization_id: orgId },
        }),
      { label: `updateUser ${u.email}` },
    )
    userId = existing.id
  } else {
    const created = must(
      `auth.createUser ${u.email}`,
      await withRetry(
        () =>
          supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name, role: u.role, organization_id: orgId },
          }),
        { label: `createUser ${u.email}` },
      ),
    )
    userId = created.user.id
  }

  // Trigger handle_new_user() profile satırını otomatik oluşturur/oluşturmuştur
  // (organization_id dahil, çünkü metadata'da geçiyor); rolü, komisyon
  // oranını ve organization_id'yi garanti altına almak için üzerine yazıyoruz
  // — bu hesap daha önce (bu migration'dan önce) başka bir organizasyona
  // ait olsa bile artık kesin olarak yeni demo organizasyonuna taşınır.
  must(
    `profiles upsert ${u.email}`,
    await supabase
      .from('profiles')
      .upsert(
        { id: userId, role: u.role, full_name: u.full_name, commission_rate: u.commission_rate, organization_id: orgId },
        { onConflict: 'id' },
      ),
  )

  return { ...u, id: userId }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  console.log('== Adapsis demo/portfolyo verisi yükleniyor ==\n')

  console.log('-> Organizasyon (yeni "şirket") oluşturuluyor...')
  const orgId = await resolveOrCreateOrganization('Adapsis Demo Portfolyo', 'adapsis-demo-portfolyo')
  console.log(`   Organizasyon hazır: ${orgId}`)

  console.log('-> Kullanıcılar (admin + satış ekibi) oluşturuluyor...')
  const users = []
  for (const u of DEMO_USERS) users.push(await upsertAuthUser(u, orgId))
  const admin = users.find((u) => u.role === 'admin')
  const salesReps = users.filter((u) => u.role === 'sales')
  console.log(`   ${users.length} kullanıcı hazır.`)

  // -------------------------------------------------------------------------
  // 2) Global ayarlar (organizasyon başına bir satır)
  // -------------------------------------------------------------------------
  console.log('-> Genel ayarlar...')
  const { data: existingSettings } = await supabase
    .from('global_settings')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()
  const settingsPayload = {
    company_name: 'Adapsis Endüstriyel Elektrik San. ve Tic. A.Ş.',
    company_address: 'Organize Sanayi Bölgesi, 10. Cadde No: 24, Kocaeli / Türkiye',
    iban: 'TR33 0006 1005 1978 6457 8413 26',
    tax_rate: 20,
    default_margin: 15,
    quote_footer_text: 'Fiyatlarımıza KDV dahil değildir. Teklif 30 gün geçerlidir. Ödeme: %50 peşin, %50 sevkiyatta.',
    discount_approval_threshold: 5,
    quote_followup_days: 3,
    organization_id: orgId,
  }
  if (existingSettings) {
    must('global_settings update', await supabase.from('global_settings').update(settingsPayload).eq('id', existingSettings.id))
  } else {
    must('global_settings insert', await supabase.from('global_settings').insert(settingsPayload))
  }

  // -------------------------------------------------------------------------
  // 3) Kategoriler
  // -------------------------------------------------------------------------
  console.log('-> Kategoriler...')
  const CATS = [
    { id: '11000000-0000-4000-8000-000000000001', name: 'Elektrik Panoları', slug: 'elektrik-panolari', sort_order: 1 },
    { id: '11000000-0000-4000-8000-000000000002', name: 'Güç Trafoları', slug: 'guc-trafolari', sort_order: 2 },
    { id: '11000000-0000-4000-8000-000000000003', name: 'Endüstriyel Motorlar', slug: 'endustriyel-motorlar', sort_order: 3 },
    { id: '11000000-0000-4000-8000-000000000004', name: 'Kablo ve Bağlantı Elemanları', slug: 'kablo-baglanti-elemanlari', sort_order: 4 },
    { id: '11000000-0000-4000-8000-000000000005', name: 'Otomasyon Sistemleri', slug: 'otomasyon-sistemleri', sort_order: 5 },
  ]
  await resolveIdsByKey('categories', 'slug', CATS, orgId)
  must(
    'categories upsert',
    await supabase.from('categories').upsert(
      CATS.map((c) => ({ ...c, description: `${c.name} ürün kategorisi`, is_active: true, organization_id: orgId })),
      { onConflict: 'id' },
    ),
  )

  // -------------------------------------------------------------------------
  // 4) Envanter
  // -------------------------------------------------------------------------
  console.log('-> Envanter...')
  const INV = [
    { id: '22000000-0000-4000-8000-000000000001', item_name: 'Yüksek Akım Trafosu 50MVA', sku: 'TR-50M', unit: 'adet', stock_level: 2, reserved_stock: 1 },
    { id: '22000000-0000-4000-8000-000000000002', item_name: 'Standart Çelik Gövde Pano', sku: 'ST-CS-A', unit: 'adet', stock_level: 85, reserved_stock: 4 },
    { id: '22000000-0000-4000-8000-000000000003', item_name: 'Endüstriyel Boya (Mavi RAL5015)', sku: 'PNT-IND-BLU', unit: 'litre', stock_level: 240, reserved_stock: 0 },
    { id: '22000000-0000-4000-8000-000000000004', item_name: 'Bakır Kablo 3x150mm² XLPE', sku: 'CBL-CU-3X150', unit: 'metre', stock_level: 1500, reserved_stock: 120 },
    { id: '22000000-0000-4000-8000-000000000005', item_name: 'Bakır Bara 100x10mm', sku: 'BKR-100X10', unit: 'metre', stock_level: 6, reserved_stock: 2 },
    { id: '22000000-0000-4000-8000-000000000006', item_name: 'Kuru Tip Trafo Nüvesi 500kVA', sku: 'CORE-KT-500', unit: 'adet', stock_level: 4, reserved_stock: 1 },
    { id: '22000000-0000-4000-8000-000000000007', item_name: 'Servo Motor Sürücü Kartı', sku: 'DRV-SRV-30', unit: 'adet', stock_level: 18, reserved_stock: 2 },
    { id: '22000000-0000-4000-8000-000000000008', item_name: 'PLC CPU Modülü', sku: 'PLC-CPU-01', unit: 'adet', stock_level: 0, reserved_stock: 0 },
    { id: '22000000-0000-4000-8000-000000000009', item_name: 'HMI Dokunmatik Ekran 7"', sku: 'HMI-TS-7', unit: 'adet', stock_level: 22, reserved_stock: 3 },
    { id: '22000000-0000-4000-8000-000000000010', item_name: 'SCADA Lisans Anahtarı', sku: 'SCD-LIC-01', unit: 'adet', stock_level: 40, reserved_stock: 0 },
    { id: '22000000-0000-4000-8000-000000000011', item_name: 'Kompanzasyon Kondansatörü 50kVAr', sku: 'CAP-50KVAR', unit: 'adet', stock_level: 60, reserved_stock: 5 },
    { id: '22000000-0000-4000-8000-000000000012', item_name: 'Asenkron Motor Gövdesi 75kW', sku: 'MOT-BODY-75', unit: 'adet', stock_level: 9, reserved_stock: 2 },
  ]
  await resolveIdsByKey('inventory', 'sku', INV, orgId)
  must(
    'inventory upsert',
    await supabase.from('inventory').upsert(
      INV.map((i) => ({ ...i, organization_id: orgId })),
      { onConflict: 'id' },
    ),
  )

  // -------------------------------------------------------------------------
  // 5) Ürünler + varyantlar
  // -------------------------------------------------------------------------
  console.log('-> Ürünler ve varyantlar...')
  const PRODUCTS = [
    {
      id: '33000000-0000-4000-8000-000000000001', category_id: CATS[0].id, name: 'Alçak Gerilim Dağıtım Panosu', sku: 'LGP-100',
      description: 'IP54 korumalı, modüler alçak gerilim ana dağıtım panosu.', base_price: 3200,
      variants: [
        { group_name: 'Gövde Tipi', is_required: true, options: [
          { label: 'Standart Çelik Gövde', value: 'standart', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[1].id, required_amount: 1 },
          { label: 'Paslanmaz Çelik Gövde (304)', value: 'paslanmaz', price_effect: { type: 'fixed', amount: 1400 }, is_default: false },
        ]},
        { group_name: 'Boya Rengi', is_required: false, options: [
          { label: 'RAL7035 Açık Gri', value: 'ral7035', price_effect: { type: 'fixed', amount: 0 }, is_default: true },
          { label: 'RAL5015 Mavi', value: 'ral5015', price_effect: { type: 'fixed', amount: 150 }, is_default: false, inventory_item_id: INV[2].id, required_amount: 3 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000002', category_id: CATS[0].id, name: 'Orta Gerilim Hücre Panosu', sku: 'OGH-200',
      description: '36kV metal muhafazalı orta gerilim hücre sistemi.', base_price: 18500,
      variants: [
        { group_name: 'Hücre Sayısı', is_required: true, options: [
          { label: '1 Hücre', value: '1', price_effect: { type: 'fixed', amount: 0 }, is_default: true },
          { label: '3 Hücre', value: '3', price_effect: { type: 'multiplier', amount: 2.6 }, is_default: false },
          { label: '5 Hücre', value: '5', price_effect: { type: 'multiplier', amount: 4.1 }, is_default: false },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000003', category_id: CATS[0].id, name: 'Kompanzasyon Panosu', sku: 'KMP-150',
      description: 'Otomatik reaktif güç kompanzasyon panosu.', base_price: 4100,
      variants: [
        { group_name: 'Kapasite', is_required: true, options: [
          { label: '150 kVAr', value: '150kvar', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[10].id, required_amount: 3 },
          { label: '300 kVAr', value: '300kvar', price_effect: { type: 'fixed', amount: 2600 }, is_default: false, inventory_item_id: INV[10].id, required_amount: 6 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000004', category_id: CATS[1].id, name: 'Kuru Tip Güç Trafosu', sku: 'KTT-500',
      description: '500kVA reçine izoleli kuru tip güç trafosu.', base_price: 26500,
      variants: [
        { group_name: 'Güç', is_required: true, options: [
          { label: '500 kVA', value: '500kva', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[5].id, required_amount: 1 },
          { label: '1000 kVA', value: '1000kva', price_effect: { type: 'fixed', amount: 15800 }, is_default: false },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000005', category_id: CATS[1].id, name: 'Yağlı Tip Dağıtım Trafosu', sku: 'YTD-630',
      description: '630kVA hermetik yağlı tip dağıtım trafosu.', base_price: 22800,
      variants: [
        { group_name: 'Trafo Tipi', is_required: true, options: [
          { label: 'Standart Trafo', value: 'standart', price_effect: { type: 'fixed', amount: 0 }, is_default: true },
          { label: '50MVA Yüksek Akım Trafosu', value: 'yuksek-akim', price_effect: { type: 'fixed', amount: 9200 }, is_default: false, inventory_item_id: INV[0].id, required_amount: 1 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000006', category_id: CATS[2].id, name: 'Asenkron Endüstriyel Motor', sku: 'AEM-75',
      description: '75kW IE3 verimlilik sınıfı asenkron motor.', base_price: 5200,
      variants: [
        { group_name: 'Devir', is_required: true, options: [
          { label: '1500 RPM', value: '1500', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[11].id, required_amount: 1 },
          { label: '3000 RPM', value: '3000', price_effect: { type: 'fixed', amount: 650 }, is_default: false, inventory_item_id: INV[11].id, required_amount: 1 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000007', category_id: CATS[2].id, name: 'Servo Motor Sürücü Seti', sku: 'SMS-30',
      description: '30kW servo motor + sürücü kombinasyonu.', base_price: 7800,
      variants: [
        { group_name: 'Sürücü Modeli', is_required: true, options: [
          { label: 'Standart Sürücü', value: 'standart', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[6].id, required_amount: 1 },
          { label: 'Gelişmiş Sürücü (Enkoder+)', value: 'gelismis', price_effect: { type: 'percentage', amount: 18 }, is_default: false, inventory_item_id: INV[6].id, required_amount: 1 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000008', category_id: CATS[3].id, name: 'XLPE Orta Gerilim Kablo', sku: 'XLP-3X150',
      description: '3x150mm² XLPE izoleli orta gerilim enerji kablosu (metre).', base_price: 42,
      variants: [
        { group_name: 'Kesit', is_required: true, options: [
          { label: '3x150mm²', value: '150', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[3].id, required_amount: 100 },
          { label: '3x240mm²', value: '240', price_effect: { type: 'multiplier', amount: 1.5 }, is_default: false },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000009', category_id: CATS[3].id, name: 'Bakır Bara Seti', sku: 'BKR-BS-01',
      description: 'Pano içi 100x10mm bakır bara montaj seti (metre).', base_price: 68,
      variants: [
        { group_name: 'Kaplama', is_required: false, options: [
          { label: 'Kaplamasız', value: 'kaplamasiz', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[4].id, required_amount: 5 },
          { label: 'Gümüş Kaplamalı', value: 'gumus', price_effect: { type: 'percentage', amount: 25 }, is_default: false, inventory_item_id: INV[4].id, required_amount: 5 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000010', category_id: CATS[4].id, name: 'PLC Kontrol Ünitesi', sku: 'PLC-CU-200',
      description: 'Modüler I/O genişletmeli PLC kontrol ünitesi.', base_price: 3900,
      variants: [
        { group_name: 'I/O Modülü', is_required: true, options: [
          { label: '16 I/O', value: '16io', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[7].id, required_amount: 1 },
          { label: '32 I/O', value: '32io', price_effect: { type: 'fixed', amount: 950 }, is_default: false, inventory_item_id: INV[7].id, required_amount: 1 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000011', category_id: CATS[4].id, name: 'SCADA İzleme Paneli', sku: 'SCD-IP-10',
      description: 'Merkezi SCADA izleme ve raporlama paneli.', base_price: 6200,
      variants: [
        { group_name: 'Lisans', is_required: true, options: [
          { label: 'Tekli Lisans', value: 'tekli', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[9].id, required_amount: 1 },
          { label: 'Çoklu Lisans (5 İstasyon)', value: 'coklu', price_effect: { type: 'fixed', amount: 3100 }, is_default: false, inventory_item_id: INV[9].id, required_amount: 5 },
        ]},
      ],
    },
    {
      id: '33000000-0000-4000-8000-000000000012', category_id: CATS[4].id, name: 'Endüstriyel HMI Panel', sku: 'HMI-P-7',
      description: '7" dokunmatik endüstriyel operatör paneli.', base_price: 1450,
      is_active: false,
      variants: [
        { group_name: 'Ekran Boyutu', is_required: true, options: [
          { label: '7"', value: '7', price_effect: { type: 'fixed', amount: 0 }, is_default: true, inventory_item_id: INV[8].id, required_amount: 1 },
          { label: '10"', value: '10', price_effect: { type: 'fixed', amount: 480 }, is_default: false, inventory_item_id: INV[8].id, required_amount: 1 },
        ]},
      ],
    },
  ]

  await resolveIdsByKey('products', 'sku', PRODUCTS, orgId)
  must(
    'products upsert',
    await supabase.from('products').upsert(
      PRODUCTS.map((p) => ({
        id: p.id, category_id: p.category_id, name: p.name, sku: p.sku, description: p.description,
        base_price: p.base_price, base_currency: 'USD', is_active: p.is_active ?? true, created_by: admin.id,
        organization_id: orgId,
      })),
      { onConflict: 'id' },
    ),
  )

  // (product_id, group_name) zaten UNIQUE; önceki çalıştırmalardan kalma
  // gerçek id'leri çözümleyip üzerine yaz, yoksa deterministik id kullan.
  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('id, product_id, group_name')
    .in('product_id', PRODUCTS.map((p) => p.id))
  const existingVariantId = Object.fromEntries(
    (existingVariants || []).map((r) => [`${r.product_id}|${r.group_name}`, r.id]),
  )

  const variantRows = []
  const variantIndex = {} // productId -> [{id, group_name, options}]
  let variantCounter = 0
  for (const p of PRODUCTS) {
    variantIndex[p.id] = []
    p.variants.forEach((v, i) => {
      variantCounter++
      const fallbackId = `7700000${(variantCounter % 10)}-0000-4000-9000-${String(variantCounter).padStart(12, '0')}`
      const vid = existingVariantId[`${p.id}|${v.group_name}`] || fallbackId
      variantRows.push({
        id: vid, product_id: p.id, group_name: v.group_name, sort_order: i,
        is_required: v.is_required, options: v.options, organization_id: orgId,
      })
      variantIndex[p.id].push({ id: vid, ...v })
    })
  }
  must('product_variants upsert', await supabase.from('product_variants').upsert(variantRows, { onConflict: 'id' }))

  // -------------------------------------------------------------------------
  // 6) Müşteriler + kontaklar
  // -------------------------------------------------------------------------
  console.log('-> Müşteriler ve kontaklar...')
  const CUSTOMERS = [
    { name: 'Marmara Enerji Üretim A.Ş.', industry: 'Enerji', status: 'active', source: 'referans', tags: ['vip', 'kurumsal'] },
    { name: 'Anadolu Otomotiv Yan Sanayi Ltd.', industry: 'Otomotiv', status: 'active', source: 'web-sitesi', tags: ['tekrar-musteri'] },
    { name: 'Ege Gıda ve İçecek San. Tic. A.Ş.', industry: 'Gıda', status: 'lead', source: 'fuar', tags: ['yeni'] },
    { name: 'Trakya Tekstil Boyahane Ltd.', industry: 'Tekstil', status: 'active', source: 'soğuk-arama', tags: [] },
    { name: 'Karadeniz İnşaat ve Taahhüt A.Ş.', industry: 'İnşaat', status: 'lead', source: 'referans', tags: ['büyük-proje'] },
    { name: 'Orta Anadolu Metal İşleme San.', industry: 'Metal İşleme', status: 'active', source: 'web-sitesi', tags: ['vip'] },
    { name: 'Batı Kimya Sanayi Tesisleri A.Ş.', industry: 'Kimya', status: 'inactive', source: 'fuar', tags: [] },
    { name: 'Bursa Cam ve Seramik Üretim A.Ş.', industry: 'Cam/Seramik', status: 'active', source: 'referans', tags: ['tekrar-musteri'] },
    { name: 'Zonguldak Madencilik ve İşletmeler A.Ş.', industry: 'Madencilik', status: 'lost', source: 'soğuk-arama', tags: [] },
    { name: 'İstanbul Lojistik ve Depoculuk Ltd.', industry: 'Lojistik', status: 'active', source: 'web-sitesi', tags: [] },
    { name: 'Konya Tarım Makineleri San. Tic.', industry: 'Tarım Makineleri', status: 'lead', source: 'fuar', tags: ['yeni'] },
    { name: 'Adana Tekstil Terbiye Fabrikası', industry: 'Tekstil', status: 'active', source: 'referans', tags: [] },
    { name: 'Kayseri Mobilya ve Ahşap San. A.Ş.', industry: 'Mobilya', status: 'inactive', source: 'web-sitesi', tags: [] },
    { name: 'Gebze Plastik Enjeksiyon San.', industry: 'Plastik', status: 'active', source: 'soğuk-arama', tags: ['vip'] },
    { name: 'Sakarya Savunma Sanayi Tedarikçisi A.Ş.', industry: 'Savunma Sanayi', status: 'active', source: 'referans', tags: ['vip', 'büyük-proje'] },
    { name: 'Denizli Tekstil İhracat A.Ş.', industry: 'Tekstil', status: 'lead', source: 'fuar', tags: [] },
    { name: 'Eskişehir Rayli Sistemler San.', industry: 'Ulaşım', status: 'lost', source: 'web-sitesi', tags: [] },
    { name: 'Mersin Liman İşletmeleri A.Ş.', industry: 'Lojistik', status: 'active', source: 'referans', tags: ['tekrar-musteri'] },
  ]
  const CONTACT_NAMES = ['Ahmet Yılmaz', 'Ayşe Demir', 'Mustafa Şahin', 'Fatma Çelik', 'Emre Arslan', 'Hatice Koç', 'Barış Doğan', 'Selin Aksoy', 'Kerem Polat', 'Burcu Er', 'Cem Yıldırım', 'Nazlı Aydoğan']

  const custRows = CUSTOMERS.map((c, i) => {
    const id = `55000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    const owner = salesReps[i % salesReps.length]
    return {
      id, company_name: c.name, industry: c.industry, status: c.status, source: c.source, tags: c.tags,
      contact_name: CONTACT_NAMES[i % CONTACT_NAMES.length],
      email: `info@${c.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.com.tr`,
      phone: `0212 5${(500 + i * 7).toString().padStart(3, '0')} ${(1000 + i * 13).toString().slice(0, 4)}`,
      address: `${c.industry} OSB, ${(i % 40) + 1}. Sokak No: ${i + 2}, Türkiye`,
      owner_id: owner.id, created_by: owner.id,
      notes: i % 3 === 0 ? 'Yıllık bakım anlaşması görüşülüyor.' : null,
      organization_id: orgId,
    }
  })
  must('customers upsert', await supabase.from('customers').upsert(custRows, { onConflict: 'id' }))

  // Demo müşterilere bağlı ilişkisel verileri temizle (yeniden çalıştırma güvenliği)
  const custIds = custRows.map((c) => c.id)
  await supabase.from('contacts').delete().in('customer_id', custIds)
  await supabase.from('activities').delete().in('customer_id', custIds)
  await supabase.from('tasks').delete().in('customer_id', custIds)
  await supabase.from('opportunities').delete().in('customer_id', custIds)
  await supabase.from('documents').delete().in('customer_id', custIds)
  await supabase.from('quotes').delete().in('customer_id', custIds)

  const contactRows = []
  custRows.forEach((c, i) => {
    contactRows.push({
      customer_id: c.id, full_name: c.contact_name, title: 'Satın Alma Müdürü', email: c.email, phone: c.phone,
      is_primary: true, created_by: c.owner_id, organization_id: orgId,
    })
    if (i % 2 === 0) {
      contactRows.push({
        customer_id: c.id, full_name: CONTACT_NAMES[(i + 5) % CONTACT_NAMES.length], title: 'Teknik Sorumlu',
        email: `teknik@${c.email.split('@')[1]}`, phone: c.phone, is_primary: false, created_by: c.owner_id,
        organization_id: orgId,
      })
    }
  })
  must('contacts insert', await supabase.from('contacts').insert(contactRows))

  // -------------------------------------------------------------------------
  // 7) Teklifler (son 8 ay, karışık durum)
  // -------------------------------------------------------------------------
  console.log('-> Teklifler...')
  const STATUSES = ['accepted', 'accepted', 'pending', 'rejected', 'pending_admin_approval', 'accepted']
  const quoteRows = []
  const QUOTE_COUNT = 26
  for (let i = 0; i < QUOTE_COUNT; i++) {
    const product = PRODUCTS[i % PRODUCTS.length]
    const variants = variantIndex[product.id]
    const customer = custRows[i % custRows.length]
    const rep = salesReps[i % salesReps.length]
    const status = STATUSES[i % STATUSES.length]
    const discount = status === 'pending_admin_approval' ? 8 + (i % 4) : i % 5 === 0 ? 2 : 0

    const configuration = variants.map((v) => {
      const opt = v.options[i % v.options.length]
      const item = {
        variant_id: v.id, selected_value: opt.value, label: `${v.group_name}: ${opt.label}`,
      }
      if (opt.inventory_item_id) {
        item.inventory_id = opt.inventory_item_id
        item.required_amount = opt.required_amount ?? 1
      }
      return item
    })

    let base = product.base_price
    for (const v of variants) {
      const opt = v.options[i % v.options.length]
      if (opt.price_effect.type === 'fixed') base += opt.price_effect.amount
      else if (opt.price_effect.type === 'multiplier') base *= opt.price_effect.amount
      else if (opt.price_effect.type === 'percentage') base += product.base_price * (opt.price_effect.amount / 100)
    }
    const finalPrice = Math.round(base * (1 - discount / 100) * 100) / 100
    const daysBack = 5 + i * 9 // en yeniden en eskiye ~8 aya yayılır

    const row = {
      id: `66000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      product_id: product.id, customer_id: customer.id,
      customer_company: customer.company_name, customer_contact: customer.contact_name,
      configuration, base_price_snapshot: Math.round(base * 100) / 100, final_price: finalPrice,
      currency: 'USD', status, discount_percentage: discount, created_by: rep.id,
      is_read_by_admin: i % 3 !== 0, is_read_by_sales: true,
      created_at: daysAgo(daysBack), organization_id: orgId,
    }
    if (status === 'accepted') row.accepted_at = daysAgo(Math.max(0, daysBack - 2))
    quoteRows.push(row)
  }
  must('quotes insert', await supabase.from('quotes').insert(quoteRows))

  // -------------------------------------------------------------------------
  // 8) Fırsatlar (pipeline)
  // -------------------------------------------------------------------------
  console.log('-> Satış fırsatları (pipeline)...')
  const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const oppRows = custRows.slice(0, 16).map((c, i) => {
    const stage = STAGES[i % STAGES.length]
    const rep = salesReps[i % salesReps.length]
    const row = {
      customer_id: c.id, title: `${c.company_name.split(' ')[0]} - ${PRODUCTS[i % PRODUCTS.length].name} Projesi`,
      stage, estimated_value: 8000 + i * 3200, currency: 'USD',
      probability: { lead: 15, qualified: 35, proposal: 55, negotiation: 75, won: 100, lost: 0 }[stage],
      expected_close_date: daysFromNow(20 + i * 5).slice(0, 10),
      owner_id: rep.id, created_by: rep.id, organization_id: orgId,
    }
    if (stage === 'lost') {
      row.lost_reason = i % 2 === 0 ? 'Fiyat rekabeti kaybedildi' : 'Bütçe ertelendi'
      row.competitor = i % 2 === 0 ? 'Rakip Elektrik A.Ş.' : null
      row.closed_at = daysAgo(10 + i)
    }
    if (stage === 'won') row.closed_at = daysAgo(5 + i)
    return row
  })
  must('opportunities insert', await supabase.from('opportunities').insert(oppRows))

  // -------------------------------------------------------------------------
  // 9) Aktiviteler (zaman çizelgesi)
  // -------------------------------------------------------------------------
  console.log('-> Aktiviteler...')
  const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'other']
  const ACTIVITY_SUBJECTS = [
    'Teknik şartname görüşmesi', 'Fiyat teklifi sunumu', 'Saha ziyareti planlandı', 'Sözleşme koşulları müzakeresi',
    'Ürün demo talebi', 'Teslimat takvimi görüşmesi', 'Numune gönderimi', 'Yıllık bakım teklifi', 'Referans görüşmesi',
  ]
  const activityRows = []
  custRows.forEach((c, i) => {
    const count = 1 + (i % 3)
    for (let j = 0; j < count; j++) {
      activityRows.push({
        customer_id: c.id, type: ACTIVITY_TYPES[(i + j) % ACTIVITY_TYPES.length],
        subject: ACTIVITY_SUBJECTS[(i + j) % ACTIVITY_SUBJECTS.length],
        notes: 'Görüşme notları: müşteri talepleri kayıt altına alındı.',
        activity_date: daysAgo(j * 6 + i), created_by: c.owner_id, organization_id: orgId,
      })
    }
  })
  must('activities insert', await supabase.from('activities').insert(activityRows))

  // -------------------------------------------------------------------------
  // 10) Görevler (bekleyen/gecikmiş/tamamlanmış)
  // -------------------------------------------------------------------------
  console.log('-> Görevler...')
  const TASK_TITLES = [
    'Müşteriyi ara ve teklifi teyit et', 'Teknik dosyayı hazırla ve gönder', 'Sözleşmeyi imzaya hazırla',
    'Sevkiyat programını müşteriyle paylaş', 'Fiyat revizyonu için onay al', 'Numune talebini karşıla',
  ]
  const taskRows = custRows.slice(0, 14).map((c, i) => {
    const dueOffset = i % 4 === 0 ? -(2 + (i % 3)) : i % 3 === 0 ? 0 : 3 + i
    const status = dueOffset < -1 && i % 2 === 0 ? 'completed' : 'pending'
    const row = {
      customer_id: c.id, title: TASK_TITLES[i % TASK_TITLES.length],
      description: 'Otomatik takip görevi (bekleyen teklif sonrası oluşturuldu).',
      due_date: daysFromNow(dueOffset), assigned_to: c.owner_id, created_by: c.owner_id, status,
      organization_id: orgId,
    }
    if (status === 'completed') row.completed_at = daysAgo(1)
    return row
  })
  must('tasks insert', await supabase.from('tasks').insert(taskRows))

  // -------------------------------------------------------------------------
  // 11) Teklif şablonları
  // -------------------------------------------------------------------------
  console.log('-> Teklif şablonları...')
  const templateRows = PRODUCTS.slice(0, 6).map((p, i) => {
    const variants = variantIndex[p.id]
    const configuration = variants.map((v) => {
      const opt = v.options[0]
      return { variant_id: v.id, selected_value: opt.value, label: `${v.group_name}: ${opt.label}` }
    })
    return {
      product_id: p.id, name: `${p.name} - Standart Şablon`, configuration,
      created_by: salesReps[i % salesReps.length].id, organization_id: orgId,
    }
  })
  await supabase.from('quote_templates').delete().in('product_id', PRODUCTS.map((p) => p.id))
  must('quote_templates insert', await supabase.from('quote_templates').insert(templateRows))

  // -------------------------------------------------------------------------
  // 12) Sistem talepleri (admin onayı bekleyen ürün/envanter istekleri)
  // -------------------------------------------------------------------------
  console.log('-> Sistem talepleri...')
  const reqRows = [
    { request_type: 'product', item_id: PRODUCTS[0].id, item_name: PRODUCTS[0].name, requested_by: salesReps[0].id, request_note: 'Bu ürüne yeni bir "Hızlı Montaj Kiti" opsiyonu eklenmesini talep ediyorum.', status: 'pending' },
    { request_type: 'inventory', item_id: INV[7].id, item_name: INV[7].item_name, requested_by: salesReps[1].id, request_note: 'PLC CPU Modülü stoğu 0, acil sipariş gerekiyor.', status: 'pending' },
    { request_type: 'inventory', item_id: INV[4].id, item_name: INV[4].item_name, requested_by: salesReps[2].id, request_note: 'Bakır bara stok seviyesi kritik, yeniden temin talep ediyorum.', status: 'approved', admin_response: 'Onaylandı, tedarikçiye sipariş verildi.' },
    { request_type: 'product', item_id: PRODUCTS[11].id, item_name: PRODUCTS[11].name, requested_by: salesReps[0].id, request_note: 'HMI panelin pasif ürün listesinden çıkarılıp tekrar aktif edilmesini rica ederim.', status: 'rejected', admin_response: 'Yeni model geliştirme aşamasında, şimdilik pasif kalacak.' },
    { request_type: 'product', item_id: PRODUCTS[3].id, item_name: PRODUCTS[3].name, requested_by: salesReps[1].id, request_note: '1000kVA seçeneği için ayrı SKU tanımlanabilir mi?', status: 'pending' },
    { request_type: 'inventory', item_id: INV[0].id, item_name: INV[0].item_name, requested_by: salesReps[2].id, request_note: '50MVA trafo stoğu 2 adete düştü, müşteri talebi yüksek.', status: 'approved', admin_response: 'Üretimden 3 adet daha talep edildi.' },
  ]
  await supabase.from('system_requests').delete().in('requested_by', salesReps.map((r) => r.id))
  must(
    'system_requests insert',
    await supabase.from('system_requests').insert(reqRows.map((r) => ({ ...r, organization_id: orgId }))),
  )

  // -------------------------------------------------------------------------
  // 13) Satış kotaları (bu ay)
  // -------------------------------------------------------------------------
  console.log('-> Satış kotaları...')
  const targetRows = salesReps.map((rep, i) => ({
    profile_id: rep.id, period_month: monthStart(0), target_amount: 40000 + i * 10000, target_currency: 'USD',
    organization_id: orgId,
  }))
  must(
    'sales_targets upsert',
    await supabase.from('sales_targets').upsert(targetRows, { onConflict: 'profile_id,period_month' }),
  )

  // -------------------------------------------------------------------------
  // 14) Müşteri dokümanları (gerçek dosya + storage upload)
  // -------------------------------------------------------------------------
  console.log('-> Müşteri dokümanları...')
  const docTargets = custRows.slice(0, 6)
  for (const c of docTargets) {
    const fileName = 'teklif-sartname.txt'
    const content = `Adapsis Endüstriyel Elektrik\nMüşteri: ${c.company_name}\nDoküman: Teknik şartname (demo placeholder dosyası)\nOluşturulma: ${new Date().toISOString()}`
    const path = `${c.id}/demo-${fileName}`
    const { error: upErr } = await supabase.storage
      .from('customer-documents')
      .upload(path, new Blob([content], { type: 'text/plain' }), { upsert: true, contentType: 'text/plain' })
    if (upErr) {
      console.warn(`   (uyarı) storage upload başarısız [${c.company_name}]: ${upErr.message}`)
      continue
    }
    must(
      `documents insert ${c.company_name}`,
      await supabase.from('documents').insert({
        customer_id: c.id, file_name: fileName, storage_path: path,
        file_size: content.length, mime_type: 'text/plain', uploaded_by: c.owner_id,
        organization_id: orgId,
      }),
    )
  }

  console.log('\n== TAMAMLANDI ==')
  console.log('------------------------------------------')
  console.log('Demo Admin Girişi:')
  console.log(`  URL   : http://localhost:3000/login`)
  console.log(`  Email : ${admin.email}`)
  console.log(`  Şifre : ${admin.password}`)
  console.log('------------------------------------------')
  console.log('Satış ekibi hesapları (aynı şifre):')
  salesReps.forEach((r) => console.log(`  ${r.email} — ${r.full_name}`))
  console.log('------------------------------------------')
}

main().catch((e) => {
  console.error('\nSeed işlemi başarısız oldu:', e.message)
  process.exit(1)
})
