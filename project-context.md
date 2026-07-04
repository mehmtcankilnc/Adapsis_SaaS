# Project: Adapsis - B2B Dynamic Product Configurator & Sales SaaS

## Proje Özeti

Adapsis, fabrikalar ve özel üretim yapan (trafo, endüstriyel makine, pano vb.) B2B işletmeler için tasarlanmış, dinamik ürün konfigürasyon ve teklif/satış yönetim sistemidir.

## Kritik İş Mantığı (Core Business Logic)

1. **Dinamik Ürün Yapısı (En Önemli Kural):** Ürünlerin sabit, önceden tanımlanmış sütunları (boy, en, renk) YOKTUR. Her ürün, sınırsız sayıda ve esneklikte "Varyasyon Grubuna" ve "Seçeneklere" sahip olmalıdır. Bu yüzden veritabanında ürün özellikleri kesinlikle **JSONB** formatında tutulmalıdır.
2. **Dinamik Fiyatlandırma:** Her ürünün bir taban fiyatı vardır. Eklenen her dinamik seçeneğin fiyata bir etkisi olabilir (Örn: +500$, -100$ veya taban fiyat x 1.2).
3. **Çoklu Döviz (Multi-Currency):** Veritabanındaki tüm fiyatlar "Base Currency" (örn. USD) olarak tutulmalıdır. Satış ekranında kullanıcıya anlık döviz kurları ile çevrilerek gösterilmelidir.
4. **Roller:** - `Admin/Üretim`: Dinamik ürünleri, özellikleri ve fiyat çarpanlarını sisteme tanımlar.
   - `Satış (Sales)`: Önceden tanımlanmış opsiyonları seçerek (konfigüratör) müşteri için nihai ürünü oluşturur, toplam fiyatı görür ve sipariş/teklif oluşturur.

## Modüller

- **Product Builder (Admin):** Ürün ve dinamik özellik oluşturma ekranları.
- **Sales Configurator:** Satış ekibi için, bağımlı dropdownlar ve anlık fiyat hesaplaması içeren ürün seçim arayüzü (Sepet mantığı).
- **Quote/Order Management:** Oluşturulan konfigürasyonların kaydedilmesi ve yönetilmesi.
