# Başarsoft — OpenLayers Tabanlı Web Harita Uygulaması

> **Başvuru:** Başarsoft İşe Giriş Case Çalışması
> **Aday:** *(adınızı buraya yazın)*
> **Teslim Tarihi:** *(tarih)*

OpenLayers tabanlı bir web harita uygulaması. Kullanıcılar harita üzerine nokta ekleyebilir, sorgulayabilir, mekansal filtre uygulayabilir (buffer / dikdörtgen / poligon), koordinat dönüşümü (EPSG:4326 ↔ EPSG:3857) yapabilir ve verileri GeoJSON olarak dışa aktarabilir.

---

## 📑 İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Seçimleri ve Mimari](#teknoloji-seçimleri-ve-mimari)
- [Klasör Yapısı](#klasör-yapısı)
- [Kurulum](#kurulum)
  - [Önkoşullar](#önkoşullar)
  - [Veritabanı (PostgreSQL + PostGIS)](#veritabanı-postgresql--postgis)
  - [Backend Çalıştırma](#backend-çalıştırma)
  - [Frontend Çalıştırma](#frontend-çalıştırma)
- [Konfigürasyon (Environment Variables)](#konfigürasyon-environment-variables)
- [Veritabanı Yedeği](#veritabanı-yedeği)
- [Canlı Yayın (Railway Deployment)](#canlı-yayın-railway-deployment)
- [Bilinen Sınırlamalar / Geliştirilebilir Yönler](#bilinen-sınırlamalar--geliştirilebilir-yönler)

---

## Özellikler

> Bu liste geliştirme ilerledikçe işaretlenecek.

- Harita açılışı (OpenStreetMap base layer, Türkiye odaklı zoom)
- Mouse konumuna göre anlık koordinat gösterimi
- Nokta ekleme (modal ile ad, numara, açıklama, kategori)
- Nokta listeleme, filtreleme, sıralama
- Kayıtlı noktaların haritada cluster ile gösterimi
- Kategoriye göre farklı icon/stil
- Popup ile nokta güncelleme & silme (onaylı)
- Mekansal sorgular: Buffer (500/1000/5000 m), Dikdörtgen, Poligon
- Koordinat dönüşümü EPSG:4326 ↔ EPSG:3857
- GeoJSON / CSV export
- Katman yönetimi (OSM, Noktalar, Yardımcı katman)

---

## Teknoloji Seçimleri ve Mimari


| Katman     | Teknoloji                              | Sürüm    | Neden?                                                   |
| ---------- | -------------------------------------- | -------- | -------------------------------------------------------- |
| Frontend   | React (Vite)                           | 18+      | Hızlı geliştirme, geniş ekosistem, ödev şartı            |
| Harita     | OpenLayers                             | 9+       | Ödev şartı (6+); gelişmiş mekansal yetenekler            |
| Backend    | ASP.NET Core Web API                   | .NET 9   | Ödev şartı; performanslı, modern                         |
| ORM        | EF Core + NetTopologySuite             | 9.x      | PostGIS uyumlu mekansal tip desteği                      |
| Veritabanı | PostgreSQL + PostGIS                   | 16 / 3.5 | Mekansal sorgular için endüstri standardı                |
| Stil/UI    | *(MUI veya Antd — sonra belirlenecek)* | -        | Modal, tablo, form için hazır bileşenler                 |
| Yayın      | Railway                                | -        | GitHub'a bağlı otomatik deploy, PostgreSQL servisi sunar |


### Neden PostgreSQL + PostGIS?

Ödevde **buffer içinde kalan noktalar**, **dikdörtgen/poligon içindeki noktalar** gibi mekansal sorgular var. JSON dosyası veya SQLite ile bunları yapmak hem yavaş hem de hatalı sonuç verir (Dünya yuvarlak; düz mantıkla yazılan bir buffer kutuptan uzaklaştıkça bozulur). **PostGIS** bu işleri optimize fonksiyonlarla (`ST_Within`, `ST_DWithin`, `ST_Contains`) ve doğru projeksiyon hesaplarıyla yapar.

### Mimari Akış (Yüksek Seviye)

```
 ┌─────────────┐  HTTP (JSON/GeoJSON)  ┌──────────────────┐  EF Core   ┌──────────────────┐
 │   React +   │ ───────────────────▶  │  ASP.NET Core    │ ─────────▶ │  PostgreSQL +    │
 │ OpenLayers  │ ◀───────────────────  │   Web API        │ ◀───────── │     PostGIS      │
 └─────────────┘                       └──────────────────┘            └──────────────────┘
       ▲                                       │
       │                                       ▼
   OpenStreetMap                          Swagger UI
   (tile server)                          (geliştirme için)
```

---

## Klasör Yapısı

```
basarsoft-map-app/
├── backend/              # ASP.NET Core Web API projesi
│   └── BasarsoftOdev.Api/
├── frontend/             # React + Vite + OpenLayers projesi
├── database/             # Veritabanı yedeği (.backup), seed SQL
├── docs/                 # Mimari notları, ekran görüntüleri
├── .gitignore
├── .editorconfig
└── README.md             # Bu dosya
```

---

## Kurulum

### Önkoşullar


| Araç       | Sürüm                 |
| ---------- | --------------------- |
| .NET SDK   | 8.0 veya 9.0          |
| Node.js    | 20+                   |
| PostgreSQL | 16+ (PostGIS 3.x ile) |
| Git        | 2.40+                 |


### Veritabanı (PostgreSQL + PostGIS)

```sql
-- 1) Veritabanını oluştur
CREATE DATABASE basarsoft_map;

-- 2) İlgili veritabanına bağlan, sonra PostGIS eklentisini etkinleştir
\c basarsoft_map
CREATE EXTENSION IF NOT EXISTS postgis;

-- 3) Doğrula
SELECT PostGIS_Full_Version();
```

### Backend Çalıştırma

```powershell
cd backend/BasarsoftOdev.Api
dotnet restore
dotnet ef database update     # EF Core migration'larını uygular
dotnet run
```

Backend `http://localhost:5000` üzerinde çalışır. Swagger UI: `http://localhost:5000/swagger`

### Frontend Çalıştırma

```powershell
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:5173` üzerinde açılır.

---

## Konfigürasyon (Environment Variables)

> **🔒 Önemli:** Connection string asla repo'ya commit edilmez. Aşağıdaki ayarlar **environment variable** veya `**appsettings.Development.json`** (gitignore'da) üzerinden verilir.

### Backend


| Değişken                               | Açıklama                          | Örnek (yerel)                                                                    |
| -------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `ConnectionStrings__DefaultConnection` | PostgreSQL bağlantı string'i      | `Host=localhost;Port=5432;Database=basarsoft_map;Username=postgres;Password=...` |
| `DATABASE_URL`                         | Railway'in otomatik sağladığı URL | `postgresql://user:pass@host:port/db`                                            |
| `Cors__AllowedOrigins`                 | İzin verilen frontend origin'leri | `http://localhost:5173`                                                          |


### Frontend


| Değişken            | Açıklama              | Örnek                   |
| ------------------- | --------------------- | ----------------------- |
| `VITE_API_BASE_URL` | Backend API kök URL'i | `http://localhost:5000` |


---

## Veritabanı Yedeği

> Ödev şartı: PostgreSQL kullanılıyorsa veritabanının yedek dosyası proje ile paylaşılmalı.

Teslim öncesi yedek almak için:

```powershell
pg_dump -U postgres -h localhost -d basarsoft_map -F c -f database/basarsoft_map_backup.backup
```

Geri yüklemek için:

```powershell
pg_restore -U postgres -h localhost -d basarsoft_map -c database/basarsoft_map_backup.backup
```

---

## Canlı Yayın (Railway Deployment)

> *(Bu bölüm canlıya alma adımında doldurulacak.)*

- Railway hesabı oluştur
- GitHub repo'sunu Railway'e bağla
- PostgreSQL servisi ekle, PostGIS eklentisini etkinleştir
- Backend için service ekle: `backend/BasarsoftOdev.Api` root path
- Frontend için service ekle: `frontend` root path
- Environment variable'ları gir (`DATABASE_URL` otomatik, `VITE_API_BASE_URL` elle)

**Canlı URL:** *(deploy sonrası eklenecek)*

---

## Bilinen Sınırlamalar / Geliştirilebilir Yönler

> *(Geliştirme tamamlandıkça doldurulacak.)*

- Authentication implement edilmedi (opsiyonel madde)
- Unit test kapsamı sınırlı (opsiyonel madde)
- Ölçüm aracı eklenebilir (opsiyonel madde)

---

## Lisans

Bu proje değerlendirme amaçlı hazırlanmıştır.