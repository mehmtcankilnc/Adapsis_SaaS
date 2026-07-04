# Tech Stack & Coding Standards

## Stack

- **Backend/API:** Node.js
- **Database & Auth:** Supabase (PostgreSQL)
- **Frontend:** React / Next.js (TypeScript)
- **Styling:** Tailwind CSS + UI Library (shadcn/ui veya Radix önerilir)
- **State Management:** Zustand (Sepet ve konfigüratör state'i için)

## Styling & UI/UX Design Principles

- **Avoid Generic AI SaaS Look (Kritik Kural):** Kesinlikle birbirinin kopyası olan, klasik "AI ile üretilmiş standart dashboard" veya jenerik Vercel/Tailwind şablonlarına benzeyen bir tasarım YAPMA. Klişe gölgelerden ve standart renk paletlerinden (örn. standart Tailwind mavisi/indigosu) kaçın.
- **Design Language:** B2B üretim ve fabrika sektörüne hitap edildiği için "Endüstriyel, Güçlü ama Modern" (Industrial, Robust yet Modern) bir tasarım dili kullan. Özgün, premium hissettiren, karakteri olan bir UI/UX kurgula.
- **Customization:** Shadcn/ui veya benzeri kütüphaneleri kullanırken varsayılan temalarıyla bırakma. Tipografi ve renk paletini uygulamanın "özgün ve yüksek kaliteli" vizyonuna göre özelleştir.

## Supabase & Database Rules

- İlişkisel veriler için foreign key'leri doğru kur, ancak dinamik ürün spesifikasyonları için tabloları sütunlara boğma; `JSONB` veri tipini kullan.
- Row Level Security (RLS) politikalarını baştan kurgula. (Satış personeli sadece satış ekranını, Admin her yeri görebilmeli).
- Supabase client'ını frontend'de verimli kullan, ancak 3. parti API istekleri (Döviz kurları) veya ağır işlemler için Node.js backend'ini kullan.

## Coding Style & Agent Directives

- **TypeScript:** Kesinlikle `any` kullanma. Tüm dinamik JSONB yapıları için jenerik (generic) interfaceler oluştur.
- **Modülerlik:** Her bileşeni küçük ve tekrar kullanılabilir yaz. "God component" (tek dosyada binlerce satır) yapmaktan kaçın.
- **Vibe Coding Rule:** Kod yazarken gereksiz AI açıklamaları yapma, doğrudan kaliteli ve temiz kod üret. İletişim kurarken veya kod içi yorumlarda robotik/yapay kalıplardan uzak dur, doğal ve profesyonel bir dil kullan.
- Hata yönetimini (Error Handling) global bir seviyede yap, kullanıcıya her zaman anlamlı toast mesajları göster.
