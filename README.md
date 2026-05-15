# Başarsoft — OpenLayers Tabanlı Web Harita Uygulaması

> **Başvuru:** Başarsoft İşe Giriş Case Çalışması  
> **Aday:** *(adınızı buraya yazın)*  
> **Teslim Tarihi:** *(tarih)*

OpenLayers tabanlı bir web harita uygulaması. Kullanıcılar harita üzerine nokta ekleyebilir, kayıtlı noktaları görüntüleyebilir ve katmanları yönetebilir. Backend **katmanlı mimari** (API / BLL / DAL / Domain), **JWT kimlik doğrulama** ve **EPSG:4326 ↔ EPSG:3857** koordinat dönüşümü ile çalışır.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Backend Mimarisi](#backend-mimarisi)
- [Klasör Yapısı](#klasör-yapısı)
- [Kurulum](#kurulum)
  - [Unit / integration testleri (çalıştırma)](#unit--integration-testleri-çalıştırma)
- [Kimlik Doğrulama (JWT)](#kimlik-doğrulama-jwt)
- [REST API](#rest-api)
- [Konfigürasyon](#konfigürasyon)
- [Veritabanı Yedeği](#veritabanı-yedeği)
- [Performans test verisi (SQL, opsiyonel)](#performans-test-verisi-sql-opsiyonel)
- [BAŞARSOFT demo verisi (SQL, opsiyonel)](#başarsoft-demo-verisi-sql-opsiyonel)
- [Canlı Yayın (Railway)](#canlı-yayın-railway)
- [Opsiyonel Geliştirmeler](#opsiyonel-geliştirmeler)
- [Bilinen Sınırlamalar](#bilinen-sınırlamalar)

---

## Özellikler

### Tamamlanan (temel ödev)

- [x] Tam ekran harita (OpenStreetMap, Türkiye odaklı başlangıç zoom’u)
- [x] Mouse konumuna göre anlık **EPSG:4326 / EPSG:3857** koordinat gösterimi
- [x] Nokta ekleme: modal ile **ad, numara, açıklama, kategori** (kategoriler veritabanından)
- [x] Backend’den nokta listeleme ve haritada gösterme (cluster + kategori renkleri)
- [x] Yakın nokta uyarısı (**50 m** — hem frontend hem API `PROXIMITY_WARNING`)
- [x] Katman paneli, kategori legend, üst menü (Nokta Ekle / İçe Aktar / Ölçüm / Sorgula / Mekansal Sorgu / Katmanlar)
- [x] Nokta sorgulama tablosu (filtre, GeoJSON/CSV dışa aktarma), detay popup (görüntüle / düzenle / sil)
- [x] Mekansal sorgu: buffer, dikdörtgen (drag box), poligon çizimi
- [x] JWT + refresh token, **LoginOverlay** (giriş / kayıt), roller: **Admin**, **User**
- [x] Admin tüm noktaları görür; User yalnızca kendi eklediklerini
- [x] Veritabanında **4326 ve 3857** koordinatların birlikte saklanması
- [x] Standart API yanıtı: `ApiResponse<T>` (`success`, `data`, `error`, `traceId`)
- [x] Serilog (konsol + dosya, TraceId/UserName), `LoggingScopeMiddleware`, `RequestLoggingMiddleware`, FluentValidation, global exception middleware

### Opsiyonel geliştirmeler (uygulanan)

Ayrıntılar için [Opsiyonel Geliştirmeler](#opsiyonel-geliştirmeler) bölümüne bakın.

- [x] **1.** WKT / GeoJSON içe aktarım → veritabanına `MapPoint` kaydı
- [x] **2.** Haritada ölçüm aracı (uzunluk / alan, geodezik)
- [x] **3.** Undo / Redo (oturum içi, API senkronlu)
- [x] **4.** Sunucu tarafında bbox filtreli sorgu
- [x] **5.** 10.000+ kayıt performans yaklaşımı (bbox, `limit`, cluster, zoom eşiği)
- [x] **6.** Basit authentication (JWT, refresh, `/me`, `/logout`, oturum yenileme)
- [x] **7.** Loglama (Serilog, `LoggingScopeMiddleware`, yapılandırılmış istek logları)
- [x] **8.** Unit / integration test (`BasarsoftOdev.Tests`, xUnit + `WebApplicationFactory`)

### Diğer / kısmi

- [x] GeoJSON / CSV dışa aktarma — `QueryPointsModal` + `pointExport.js` (sorgu sonucu indirme)
- [x] BAŞARSOFT demo verisi — [BAŞARSOFT demo verisi (SQL, opsiyonel)](#başarsoft-demo-verisi-sql-opsiyonel) (`BASAR-*`, 10k nokta, Türkiye üzerinde yazı)

---

## Teknoloji Yığını

| Alan | Teknoloji | Not |
|------|-----------|-----|
| Frontend | React 19 + Vite 8 | SPA |
| UI | MUI 9 | Modal, dialog, panel |
| Harita | OpenLayers 10 | EPSG:3857 görüntüleme |
| HTTP | Axios | JWT Bearer interceptor |
| Backend | ASP.NET Core 9 Web API | İnce controller’lar |
| Kimlik | ASP.NET Core Identity + JWT | Cookie değil; Bearer token |
| ORM | EF Core 9 | Koordinatlar ayrı sütunlarda (4326 + 3857) |
| Doğrulama | FluentValidation | BLL DTO’ları |
| Log | Serilog | `Logs/log-*.txt` |
| Geometri (import) | NetTopologySuite | WKT / GeoJSON parse (BLL) |
| Veritabanı | PostgreSQL 16+ | Nokta verisi ve Identity |

**Çözüm dosyası:** `BasarsoftMapApp.sln` (kök dizin)

---

## Backend Mimarisi

Katmanlar ve bağımlılık yönü:

```
BasarsoftOdev.Api   →  BLL, DAL
BasarsoftOdev.DAL   →  BLL, Domain
BasarsoftOdev.BLL   →  Domain
BasarsoftOdev.Domain   (entity, enum, value object)
```

| Katman | Sorumluluk |
|--------|------------|
| **Domain** | `MapPoint`, `ApplicationUser`, `RefreshToken`, enum’lar |
| **BLL** | İş kuralları, DTO, validator, `ICoordinateTransformationService`, `ApiResponse<T>` |
| **DAL** | `AppDbContext`, repository’ler, EF migration’lar, rol/admin seed |
| **Api** | Controller, `ExceptionHandlingMiddleware`, `LoggingScopeMiddleware`, `RequestLoggingMiddleware`, DI, Swagger, Serilog |

### Mimari akış

```
┌─────────────┐  Bearer JWT + JSON   ┌──────────────┐   EF Core    ┌─────────────────┐
│ React + OL  │ ◀──────────────────▶ │  Api (REST)  │ ◀──────────▶ │  PostgreSQL     │
└─────────────┘                      │  BLL / DAL   │              └─────────────────┘
       ▲                             └──────────────┘              └─────────────────┘
       │                                     │
  OpenStreetMap                          Swagger (/swagger)
```

### `map_points` veri modeli (ödev şartı)

| Alan | Açıklama |
|------|----------|
| `Id` | Birincil anahtar |
| `Name` | Nokta adı |
| `Number` | Numara / kod |
| `Description` | Açıklama (opsiyonel) |
| `Category` | Depo, Bayi, Musteri, Ofis |
| `Longitude`, `Latitude` | EPSG:4326 (WGS84) |
| `XMercator`, `YMercator` | EPSG:3857 (Web Mercator) |
| `CreatedAt` | Oluşturulma tarihi |

Create/update isteğinde yalnızca 4326 **veya** 3857 gönderilebilir; `CoordinateTransformationService` eksik alanları doldurur. Yakınlık kontrolü 3857 metre koordinatları üzerinden yapılır.

---

## Klasör Yapısı

```
basar_odev/
├── BasarsoftMapApp.sln
├── backend/
│   ├── BasarsoftOdev.Api/          # REST, middleware (exception / logging / request), Program.cs
│   ├── BasarsoftOdev.BLL/          # Servisler, DTO, validator
│   ├── BasarsoftOdev.DAL/          # DbContext, repository, Migrations/
│   ├── BasarsoftOdev.Domain/       # Entity ve value object’ler
│   └── BasarsoftOdev.Tests/        # xUnit: Unit/ + Integration/
├── frontend/                       # React + Vite + OpenLayers
│   └── src/
│       ├── api/                    # auth.js, client.js, mapPoints.js, categories.js
│       ├── hooks/                  # useOpenLayersMap, useMapPointHistory
│       ├── utils/                  # mapBbox, mapPerformance, measureFormat, geoImportUtils, pointExport, …
│       └── components/             # MapView, QueryPointsModal, LoginOverlay, ImportGeometryModal, …
├── database/                       # yedekler + SQL scriptleri (opsiyonel test)
│   ├── seed_performance_test_points.sql   # 10k rastgele (PERF-*)
│   ├── seed_basartext_points.sql          # 10k “BAŞARSOFT” yazısı (BASAR-*)
│   ├── generate_basartext_seed.py         # seed_basartext_points.sql üretici
│   ├── check_perf_count.sql / check_basartext_count.sql
│   └── delete_perf_test_points.sql / delete_basartext_points.sql
├── docs/
├── .gitignore
└── README.md
```

---

## Kurulum

### Önkoşullar

| Araç | Sürüm |
|------|--------|
| .NET SDK | 9.0 |
| Node.js | 20+ |
| PostgreSQL | 16+ (PostGIS kurulu) |
| Git | 2.40+ |
| EF Core CLI | `dotnet tool install --global dotnet-ef` |

### Veritabanı (PostgreSQL + PostGIS)

```sql
CREATE DATABASE basarsoft_map;
\c basarsoft_map
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_Full_Version();
```

### Backend bağlantı ayarı

`backend/BasarsoftOdev.Api/appsettings.Development.json` dosyasını oluşturun (repo’da yoktur, `.gitignore` ile hariç tutulur):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=basarsoft_map;Username=postgres;Password=YOUR_PASSWORD"
  }
}
```

### Migration ve çalıştırma

Migration’lar **DAL** projesindedir; startup projesi **Api**’dir.

```powershell
cd D:\Basarsoft\basar_ise_giris_case\basar_odev

dotnet restore BasarsoftMapApp.sln
dotnet build BasarsoftMapApp.sln

dotnet ef database update `
  --project backend/BasarsoftOdev.DAL/BasarsoftOdev.DAL.csproj `
  --startup-project backend/BasarsoftOdev.Api/BasarsoftOdev.Api.csproj

cd backend/BasarsoftOdev.Api
dotnet run
```

| Servis | URL |
|--------|-----|
| API | http://localhost:5226 |
| Swagger | http://localhost:5226/swagger |
| DB health | http://localhost:5226/health/db |

İlk çalıştırmada seed: roller (**Admin**, **User**) ve varsayılan kullanıcı **admin** (şifre: **admin**, yalnızca geliştirme — `DependencyInjection` seed).

> **Not:** Çalışan `BasarsoftOdev.Api` süreci varken `dotnet build` dosya kilidi verebilir. `Get-Process -Name BasarsoftOdev.Api | Stop-Process -Force`

### Unit / integration testleri çalıştırma

Otomatik **xUnit** testleri (`backend/BasarsoftOdev.Tests`). Haritada deneme için kullanılan **SQL seed** verileri (`PERF-*`, `BASAR-*`) ile karıştırmayın — onlar [Performans test verisi](#performans-test-verisi-sql-opsiyonel) ve [BAŞARSOFT demo](#başarsoft-demo-verisi-sql-opsiyonel) bölümlerindedir.

#### Önkoşullar

| Gereksinim | Not |
|------------|-----|
| **.NET 9 SDK** | `dotnet --version` → `9.x` |
| Proje kökü | `BasarsoftMapApp.sln` olan dizin |
| PostgreSQL | **Gerekmez** — testler InMemory DB kullanır |
| API çalışıyor olması | **Gerekmez** — testler kendi `WebApplicationFactory` ile API’yi ayağa kaldırır |

İlk çalıştırmada paketler indirilir; gerekirse önce:

```powershell
dotnet restore BasarsoftMapApp.sln
```

#### Tüm testleri çalıştırma

Proje kökünde (PowerShell veya terminal):

```powershell
cd <PROJE_KOK_YOLU>
dotnet test backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj
```

Örnek (Windows):

```powershell
cd D:\Basarsoft\basar_ise_giris_case\basar_odev
dotnet test backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj
```

#### Beklenen sonuç

Başarılı çalıştırmada özet satırı şöyledir:

```text
Başarılı!  - Başarısız: 0, Başarılı: 16, Atlanan: 0, Toplam: 16
```

| Tür | Adet | Açıklama |
|-----|------|----------|
| Unit | 10 | Servis, validator, koordinat dönüşümü (mock / izole) |
| Integration | 6 | Gerçek HTTP pipeline (`login`, `/me`, MapPoints 401/CRUD+bbox) |

Integration testler seed kullanıcısı ile giriş yapar: **`admin` / `admin`**.

#### Seçici çalıştırma

```powershell
# Yalnızca unit testler
dotnet test backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj --filter "FullyQualifiedName~Unit"

# Yalnızca integration testler
dotnet test backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj --filter "FullyQualifiedName~Integration"

# Tek sınıf
dotnet test backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj --filter "FullyQualifiedName~AuthApiTests"

# Geçen testleri satır satır görmek
dotnet test backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj --verbosity normal
```

#### IDE ile çalıştırma

| Ortam | Yol |
|-------|-----|
| **Visual Studio** | Test Explorer → `BasarsoftOdev.Tests` → *Run All* |
| **VS Code** | C# Dev Kit veya .NET Test Explorer → test ağacından çalıştır |
| **JetBrains Rider** | *Unit Tests* penceresi → projeyi seç → Run |

IDE de aynı test projesini kullanır; ek PostgreSQL veya çalışan API gerekmez.

#### Sorun giderme

| Belirti | Çözüm |
|---------|--------|
| Derleme / dosya kilidi | `BasarsoftOdev.Api` çalışıyorsa kapatın: `Get-Process -Name BasarsoftOdev.Api -ErrorAction SilentlyContinue \| Stop-Process -Force` |
| Paket / proje bulunamadı | Proje kökünden `dotnet restore BasarsoftMapApp.sln` |
| Test projesi solution’da yok | `dotnet sln BasarsoftMapApp.sln add backend/BasarsoftOdev.Tests/BasarsoftOdev.Tests.csproj` |
| Integration login hatası | Seed şifresi `admin` (README’deki `Admin123!` değil) |

**Ortam:** `ASPNETCORE_ENVIRONMENT=Testing` → migration atlanır; `CustomWebApplicationFactory` InMemory veritabanı oluşturur (`EnsureCreated` + seed). Ayrıntılı mimari: [Opsiyonel — madde 8](#8-unit--integration-test-tamamlandı).

#### Test dosyaları

| Tür | Dosya | Kapsam |
|-----|--------|--------|
| Unit | `Unit/CoordinateTransformationServiceTests.cs` | 4326 ↔ 3857 dönüşüm |
| Unit | `Unit/MapPointCreateDtoValidatorTests.cs` | FluentValidation kuralları |
| Unit | `Unit/MapPointServiceListTests.cs` | Bbox listeleme, `truncated` |
| Integration | `Integration/AuthApiTests.cs` | `POST /api/auth/login`, `GET /api/auth/me` |
| Integration | `Integration/MapPointsApiTests.cs` | Yetkisiz 401, oluştur + bbox listele |

---

**Opsiyonel SQL test verileri (10.000 nokta):** Temel kurulumdan sonra — aşağıdaki hızlı referans veya ayrıntılı bölümler. Uygulama için zorunlu değildir.

#### 10.000 kayıt — hızlı referans (ekle / sil)

Önkoşul: [Kurulum](#kurulum) tamam, API en az bir kez çalıştırılmış (`AspNetUsers` seed). Proje kökünde:

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
```

| Amaç | Önek | Ekle (10.000 kayıt) | Sil |
|------|------|---------------------|-----|
| Performans / bbox testi | `PERF-00001` … | `psql -U postgres -h localhost -d basarsoft_map -f database/seed_performance_test_points.sql` | `psql ... -f database/delete_perf_test_points.sql` |
| Haritada **BAŞARSOFT** yazısı | `BASAR-00001` … | Önce (gerekirse): `python database/generate_basartext_seed.py` → sonra `psql ... -f database/seed_basartext_points.sql` | `psql ... -f database/delete_basartext_points.sql` |

Doğrulama: `database/check_perf_count.sql` veya `database/check_basartext_count.sql` — sonuç **10000** olmalı.

Seed scriptleri tekrar çalıştırıldığında aynı önekteki eski kayıtları önce siler, sonra yeniden ekler. Ayrıntı: [Performans test verisi](#performans-test-verisi-sql-opsiyonel), [BAŞARSOFT demo verisi](#başarsoft-demo-verisi-sql-opsiyonel).

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

| Servis | URL |
|--------|-----|
| Uygulama | http://localhost:5173 |

Sayfa açılışında `restoreSession()` kayıtlı token’ları doğrular; access süresi dolmuşsa `POST /api/auth/refresh` ile yeniler.

---

## Kimlik Doğrulama (JWT)

### Giriş

```http
POST /api/auth/login
Content-Type: application/json

{
  "userName": "admin",
  "password": "admin"
}
```

Yanıt (`ApiResponse`):

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "accessTokenExpiresAt": "...",
    "refreshTokenExpiresAt": "...",
    "roles": ["Admin"]
  }
}
```

### Refresh

```http
POST /api/auth/refresh
{ "refreshToken": "..." }
```

### Oturum bilgisi (me)

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

Yanıt: `userName`, `displayName`, `roles`, `id`.

### Çıkış

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{ "refreshToken": "..." }
```

`refreshToken` gönderilirse yalnızca o token iptal edilir; gövde boşsa kullanıcının tüm aktif refresh token’ları iptal edilir.

### İstemci davranışı

| Özellik | Dosya |
|---------|--------|
| Giriş / kayıt / çıkış | `frontend/src/api/auth.js` |
| 401 → otomatik refresh + istek tekrarı | `frontend/src/api/client.js` |
| Sayfa yükünde oturum restore | `App.jsx` → `restoreSession()` |
| Profil paneli | `LoginOverlay.jsx` |

### Swagger

**Authorize** → `Bearer {accessToken}` (kelime *Bearer* dahil).

### Rol yetkileri (MapPoints)

| İşlem | Roller | Not |
|--------|--------|-----|
| GET (liste / tekil) | Admin, User | User → yalnızca kendi noktaları |
| POST (oluştur / import) | Admin, User | |
| PUT (güncelle) | Admin, User | User → yalnızca kendi noktaları |
| DELETE | Admin, User | User → yalnızca kendi noktaları (soft delete) |

---

## REST API

Tüm korumalı uçlar `Authorization: Bearer {token}` gerektirir. Başarılı gövde genelde `ApiResponse<T>` formatındadır.

### MapPoints

| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/MapPoints` | Noktalar (opsiyonel bbox filtresi) |
| GET | `/api/MapPoints/{id}` | Tekil |
| POST | `/api/MapPoints` | Yeni nokta |
| POST | `/api/MapPoints/import` | WKT / GeoJSON toplu içe aktarım |
| PUT | `/api/MapPoints/{id}` | Güncelle |
| DELETE | `/api/MapPoints/{id}` | Sil (soft delete) |

#### Bbox filtresi (`GET /api/MapPoints`)

Görünür harita alanına göre filtre (EPSG:4326). Dört parametre **birlikte** gönderilmelidir:

| Query | Açıklama |
|-------|----------|
| `minLon` | Minimum boylam |
| `minLat` | Minimum enlem |
| `maxLon` | Maksimum boylam |
| `maxLat` | Maksimum enlem |

Örnek: `GET /api/MapPoints?minLon=28.5&minLat=36.8&maxLon=33.2&maxLat=40.1`

Parametre yoksa liste üst sınırı uygulanır (`ListMaxResults`, varsayılan **5000**). Frontend haritada `moveend` olayında bbox ile yeniden yükler (350 ms debounce). Zoom **&lt; 7** iken nokta isteği gönderilmez (`mapPerformance.js` → `MIN_ZOOM_FOR_POINT_LOAD = 7`).

**Performans (`limit` + meta yanıt):**

| Query | Açıklama |
|-------|----------|
| `limit` | Döndürülecek üst kayıt (sunucuda `BboxMaxResults` / `ListMaxResults` ile sınırlanır) |

Yanıt gövdesi artık `MapPointListResultDto`:

```json
{
  "items": [ /* MapPointResponseDto[] */ ],
  "totalCount": 10432,
  "returnedCount": 10000,
  "truncated": true,
  "maxResults": 10000
}
```

`appsettings.json` → `Map:BboxMaxResults` (10000), `Map:ListMaxResults` (5000).

**İndeks:** `(Longitude, Latitude)` — `AppDbContext` ve `upgrade_layered.sql`.

**Örnek oluşturma** (yalnızca WGS84; 3857 sunucuda hesaplanır):

```json
{
  "name": "Depo A",
  "number": "D-001",
  "description": "Ankara",
  "category": "Depo",
  "longitude": 32.85,
  "latitude": 39.92
}
```

**Örnek yanıt alanları:** `id`, `name`, `number`, `description`, `category`, `longitude`, `latitude`, `xMercator`, `yMercator`, `createdAt`.

Yakınlık ihlali: HTTP **409**, `error.code`: `PROXIMITY_WARNING` (yarıçap `Map:ProximityRadiusMeters`, varsayılan **50**).

#### İçe aktarım (`POST /api/MapPoints/import`)

WKT veya GeoJSON metninden koordinatlar çıkarılır; her koordinat bir `MapPoint` olarak kaydedilir.

**İstek gövdesi:**

```json
{
  "format": "geojson",
  "content": "{ \"type\": \"FeatureCollection\", \"features\": [...] }",
  "category": "Depo",
  "namePrefix": "İçe Aktarım",
  "numberPrefix": "IMP",
  "defaultDescription": "GeoJSON import"
}
```

| Alan | Açıklama |
|------|----------|
| `format` | `geojson`, `json` veya `wkt` |
| `content` | Ham WKT / GeoJSON metni |
| `category` | Özellikte kategori yoksa kullanılır |
| `namePrefix` | Özellikte `name` yoksa: `{prefix} 1`, `{prefix} 2`, … |
| `numberPrefix` | Özellikte `number` yoksa: `{prefix}-0001`, … |

**Desteklenen geometriler:** Point, MultiPoint, LineString, Polygon, Feature, FeatureCollection (çizgi/poligon köşeleri ayrı nokta olur).

**GeoJSON `properties` eşlemesi:** `name`, `number`, `category`, `description` (büyük/küçük harf varyantları desteklenir).

**Yanıt (`MapPointImportResultDto`):**

```json
{
  "createdCount": 2,
  "skippedCount": 1,
  "created": [ /* MapPointResponseDto[] */ ],
  "skipped": [
    { "index": 3, "longitude": 32.85, "latitude": 39.92, "reason": "..." }
  ]
}
```

Çakışan veya geçersiz koordinatlar atlanır; kısmi başarı mümkündür. Tek istekte en fazla **500** nokta. Koordinatlar Web Mercator gibi görünüyorsa (`|lon|>180` veya `|lat|>90`) otomatik **EPSG:3857** kabul edilir.

**Backend dosyaları:** `GeoGeometryParser`, `MapPointService.ImportAsync`, `MapPointImportRequestDto`.

### Auth

| Method | URL | Auth |
|--------|-----|------|
| POST | `/api/auth/login` | Hayır |
| POST | `/api/auth/register` | Hayır |
| POST | `/api/auth/refresh` | Hayır |
| GET | `/api/auth/me` | Evet (Admin, User) |
| POST | `/api/auth/logout` | Evet (Admin, User) |

---

## Konfigürasyon

> Connection string ve JWT secret **asla** üretimde repoya yazılmamalı. Yerelde `appsettings.Development.json` veya ortam değişkenleri kullanın.

### Backend (`appsettings.json` + override)

| Anahtar | Açıklama |
|---------|----------|
| `ConnectionStrings:DefaultConnection` | PostgreSQL |
| `DATABASE_URL` | Railway formatı (alternatif) |
| `Jwt:SecretKey` | En az 32 karakter (üretimde güçlü secret) |
| `Jwt:AccessTokenMinutes` | Varsayılan 60 |
| `Jwt:RefreshTokenDays` | Varsayılan 7 |
| `Map:ProximityRadiusMeters` | Varsayılan 50 |
| `Map:BboxMaxResults` | Bbox isteği üst sınırı (varsayılan 10000) |
| `Map:ListMaxResults` | Bbox’suz liste üst sınırı (varsayılan 5000) |
| `Cors:AllowedOrigins` | Ek frontend origin’leri |
| `Logging:SlowRequestThresholdMs` | Yavaş istek eşiği (ms, varsayılan 2000) |
| `Logging:SkipPathPrefixes` | İstek logu atlanacak path önekleri |
| `Serilog` | MinimumLevel, Console/File sink, enrichers |

Ortam değişkeni örneği: `ConnectionStrings__DefaultConnection`, `Jwt__SecretKey`.

### Frontend

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `VITE_API_BASE_URL` | API kök URL | `http://localhost:5226` |

**Harita performansı** (`frontend/src/utils/mapPerformance.js`, kod içi sabitler):

| Sabit | Değer | Açıklama |
|-------|-------|----------|
| `MIN_ZOOM_FOR_POINT_LOAD` | 7 | Türkiye görünümünde nokta yükleme |
| `resolveBboxLoadLimit` | zoom 7–8 → 10000; 9+ → 800–2500 | Bbox isteği `limit` parametresi |

---

## Veritabanı Yedeği

Teslim öncesi:

```powershell
pg_dump -U postgres -h localhost -d basarsoft_map -F c -f database/basarsoft_map_backup.backup
```

Geri yükleme:

```powershell
pg_restore -U postgres -h localhost -d basarsoft_map -c database/basarsoft_map_backup.backup
```

Manuel şema yükseltme (nadir):

```powershell
psql -U postgres -d basarsoft_map -f backend/BasarsoftOdev.DAL/Data/Migrations/Scripts/upgrade_layered.sql
```

---

## Performans test verisi (SQL, opsiyonel)

> **Zorunlu değil.** Uygulama bu script olmadan da çalışır. Yalnızca **madde 5** (10.000+ kayıt, bbox, `limit`, `truncated`) davranışını yerelde denemek içindir. Görsel demo için [BAŞARSOFT demo verisi](#başarsoft-demo-verisi-sql-opsiyonel) (`BASAR-*`) alternatifidir.

### Kimler okumalı?

| Amaç | Bu bölüm gerekli mi? |
|------|----------------------|
| Projeyi çalıştırmak, nokta eklemek | Hayır — yalnızca [Kurulum](#kurulum) yeterli |
| 10k+ kayıt / bbox / limit davranışını denemek | Evet — aşağıdaki adımlar |

### Okuma sırası (özet)

1. [Kurulum](#kurulum) tamamlanmış olmalı (veritabanı, migration, API bir kez `dotnet run`, frontend).
2. `psql` yüklü olmalı (PostgreSQL ile gelir; PATH’te `psql --version` çalışmalı).
3. `appsettings.Development.json` şifreniz → `YOUR_POSTGRES_PASSWORD` olarak kullanın.
4. `seed_performance_test_points.sql` çalıştırın → uygulamada haritayı test edin.
5. İşiniz bitince `delete_perf_test_points.sql` (isteğe bağlı).

### SQL dosyaları

| Dosya | İşlev |
|-------|--------|
| `database/seed_performance_test_points.sql` | 10.000 test noktası ekler |
| `database/check_perf_count.sql` | PERF ve toplam kayıt sayısını gösterir |
| `database/delete_perf_test_points.sql` | `PERF-%` kayıtlarını siler |

| Ne yapar (seed) | Açıklama |
|-----------------|----------|
| Ekler | Türkiye bbox içinde **10.000** rastgele nokta (`PERF-00001` … `PERF-10000`) |
| Tekrar çalıştırma | Önce mevcut `PERF-%` kayıtlarını siler, sonra yeniden üretir |
| Gereksinim | En az bir kullanıcı (`AspNetUsers`) — API’yi bir kez çalıştırıp migration/seed tamamlanmış olmalı |

### 1. Önkoşullar

```powershell
# Migration uygulanmış ve veritabanı oluşmuş olmalı
dotnet ef database update `
  --project backend/BasarsoftOdev.DAL/BasarsoftOdev.DAL.csproj `
  --startup-project backend/BasarsoftOdev.Api/BasarsoftOdev.Api.csproj
```

`appsettings.Development.json` içindeki `ConnectionStrings:DefaultConnection` değerlerinize göre aşağıdaki `-d`, `-U` ve şifreyi uyarlayın.

### 2. Test verisini yükle

**Windows (PowerShell)** — depoyu klonladığınız **proje kök dizininde**:

```powershell
# Örnek: cd C:\projeler\basar_odev
cd <PROJE_KOK_YOLU>

$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -d basarsoft_map -f database/seed_performance_test_points.sql
```

> `psql` bulunamazsa: PostgreSQL kurulumundaki `bin` klasörünü PATH’e ekleyin (ör. `C:\Program Files\PostgreSQL\16\bin`).

**Linux / macOS:**

```bash
cd /path/to/basar_odev
export PGPASSWORD='YOUR_POSTGRES_PASSWORD'
psql -U postgres -h localhost -d basarsoft_map -f database/seed_performance_test_points.sql
```

Beklenen çıktının son satırı:

```text
 perf_points_inserted
----------------------
                10000
```

### 3. Doğrulama (isteğe bağlı)

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -d basarsoft_map -f database/check_perf_count.sql
```

### 4. Uygulamada test

1. Backend: `cd backend/BasarsoftOdev.Api` → `dotnet run` (http://localhost:5226).
2. Frontend: `cd frontend` → `npm run dev` (http://localhost:5173).
3. Giriş: `admin` / `admin` (geliştirme seed).
4. Haritayı **yakınlaştırın** (zoom ≥ 7; daha uzaktaysa “yakınlaştırın” uyarısı normal).
5. Pan / zoom → tarayıcı **Geliştirici araçları → Ağ** sekmesinde `GET /api/mappoints?minLon=...&limit=...` istekleri.
6. Yoğun alanda sarı banner: *“X / Y gösteriliyor”* → `truncated: true`, bbox + limit çalışıyor demektir.

**Sorun giderme**

| Belirti | Olası neden |
|---------|-------------|
| Haritada hiç nokta yok | Zoom &lt; 7; yakınlaştırın |
| `psql: command not found` | PostgreSQL `bin` PATH’te değil |
| `Kullanıcı bulunamadı` (SQL) | Önce API’yi bir kez çalıştırın (Identity seed) |
| `perf_points_inserted` ≠ 10000 | Script çıktısına bakın; `check_perf_count.sql` çalıştırın |

### 5. Test verisini temizleme

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -d basarsoft_map -f database/delete_perf_test_points.sql
```

İçerik: `DELETE FROM map_points WHERE "Number" LIKE 'PERF-%';`

---

## BAŞARSOFT demo verisi (SQL, opsiyonel)

> **Zorunlu değil.** Haritada **10.000 noktanın “BAŞARSOFT”** harflerini oluşturduğu görsel bir demo içindir (performans / bbox testinden bağımsız olarak da kullanılabilir).

### Kimler okumalı?

| Amaç | Bu bölüm gerekli mi? |
|------|----------------------|
| Projeyi çalıştırmak | Hayır |
| Haritada marka yazısı demosu | Evet |
| 10k+ bbox / `limit` davranışını denemek | [Performans test verisi](#performans-test-verisi-sql-opsiyonel) (`PERF-*`) daha uygun |

### SQL dosyaları

| Dosya | İşlev |
|-------|--------|
| `database/generate_basartext_seed.py` | Piksel tabanlı yazı → `seed_basartext_points.sql` üretir (Python 3 + Pillow) |
| `database/seed_basartext_points.sql` | **10.000** noktayı veritabanına yükler (`BASAR-00001` … `BASAR-10000`) |
| `database/check_basartext_count.sql` | `BASAR-%` kayıt sayısını gösterir |
| `database/delete_basartext_points.sql` | `BASAR-%` kayıtlarını siler |

| Ne yapar (seed) | Açıklama |
|-----------------|----------|
| Konum | **Türkiye** bbox (25.5°–44.8° doğu, 35.8°–42.2° kuzey); zoom **≥ 7** (Türkiye görünümü) iken yazı okunur |
| Numara öneki | `BASAR-` |
| Tekrar çalıştırma | Önce mevcut `BASAR-%` kayıtlarını siler, sonra yeniden ekler |
| Gereksinim | En az bir kullanıcı (`AspNetUsers`) — API’yi bir kez çalıştırıp migration/seed tamamlanmış olmalı |

> **Not:** `PERF-*` ve `BASAR-*` aynı anda haritada kalabilir; karışıklığı önlemek için genelde birini kullanın (diğerini ilgili `delete_*.sql` ile silin).

### 1. SQL dosyasını üret (ilk kez veya konum/yazı değişince)

```powershell
cd <PROJE_KOK_YOLU>
python database/generate_basartext_seed.py
```

Çıktı: `database/seed_basartext_points.sql` (yaklaşık 10.000 `INSERT` satırı).

Konumu veya yazı boyutunu değiştirmek için `generate_basartext_seed.py` içindeki `TURKEY_MIN_LON`, `TURKEY_MAX_LON`, `TURKEY_MIN_LAT`, `TURKEY_MAX_LAT` ve `GEO_PAD` değerlerini düzenleyip scripti yeniden çalıştırın (merkez ve span bu sabitlerden türetilir).

### 2. Veritabanına yükle

**Windows (PowerShell):**

```powershell
cd <PROJE_KOK_YOLU>
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -d basarsoft_map -f database/seed_basartext_points.sql
```

**Linux / macOS:**

```bash
cd /path/to/basar_odev
export PGPASSWORD='YOUR_POSTGRES_PASSWORD'
psql -U postgres -h localhost -d basarsoft_map -f database/seed_basartext_points.sql
```

Beklenen çıktının son satırı:

```text
 basar_points
--------------
        10000
```

### 3. Doğrulama (isteğe bağlı)

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -d basarsoft_map -f database/check_basartext_count.sql
```

### 4. Uygulamada görüntüleme

1. Backend + frontend çalışır durumda olsun; `admin` / `admin` ile giriş yapın.
2. Haritayı açın — varsayılan Türkiye görünümü **zoom ~7**; bu seviyede noktalar yüklenir.
3. Tüm ülke kadrajında nokta kümesi **BAŞARSOFT** harflerini oluşturur (pan gerekmez).
4. Yalnızca `BASAR-*` kayıtları varken zoom **7–8**’de istemci `limit=10000` ister; sunucu üst sınırı `Map:BboxMaxResults` (10000) ile tüm yazı yüklenebilir.

### 5. Demo verisini temizleme

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -d basarsoft_map -f database/delete_basartext_points.sql
```

İçerik: `DELETE FROM map_points WHERE "Number" LIKE 'BASAR-%';`

---

## Canlı Yayın (Railway)

1. GitHub repo → Railway projesi  
2. PostgreSQL eklentisi + `CREATE EXTENSION postgis;`  
3. **Backend** servisi: root `backend/BasarsoftOdev.Api`, build `dotnet publish -c Release -o out`, start `dotnet BasarsoftOdev.Api.dll`  
4. Ortam: `DATABASE_URL`, `Jwt__SecretKey`, `Cors__AllowedOrigins` (frontend URL)  
5. **Frontend** servisi: root `frontend`, build `npm run build`, static `dist`  
6. Frontend: `VITE_API_BASE_URL` = backend public URL  

**Canlı URL:** *(deploy sonrası eklenecek)*

---

## Opsiyonel Geliştirmeler

Case dokümanındaki opsiyonel maddeler ve projedeki karşılıkları.

### 1. WKT / GeoJSON içe aktarım (tamamlandı)

**Amaç:** Harici geometri verisini okuyup noktaları veritabanına kaydetmek.

**Frontend**

- Menü → **İçe Aktar**
- Bileşen: `frontend/src/components/ImportGeometryModal.jsx`
- API: `importMapPoints()` → `POST /api/mappoints/import`
- Önizleme: `frontend/src/utils/geoImportUtils.js` (yaklaşık nokta sayısı)
- Başarılı kayıtlar haritaya eklenir ve extent’e zoom yapılır

**Backend**

- `POST /api/MapPoints/import`
- `IGeoGeometryParser` / `GeoGeometryParser` (NetTopologySuite)
- `MapPointService.ImportAsync` — yakınlık kontrolü, toplu `AddRangeAsync`

---

### 2. Haritada ölçüm aracı — uzunluk / alan (tamamlandı)

**Amaç:** Kullanıcının haritada geodezik uzunluk ve alan ölçmesi (kayıt oluşturmaz).

**Frontend**

- Menü → **Ölçüm**
- Bileşenler: `MeasurementToolbar.jsx`, `MeasurementResultPanel.jsx`
- Yardımcılar: `measureFormat.js` (`ol/sphere` — `getLength`, `getArea`), `measureStyles.js` (segment + toplam etiketleri)
- **Uzunluk:** `LineString` çizimi; segment ve toplam **m / km**
- **Alan:** `Polygon` çizimi; **m² / ha / km²**
- Çizimler ölçüm katmanında kalır; **Çizimleri temizle** veya paneli kapatma
- **Esc:** aktif çizimi veya aracı iptal

---

### 3. Undo / Redo (tamamlandı)

**Amaç:** Nokta CRUD işlemlerini oturum içinde geri al / yinele (sayfa yenilenince sıfırlanır).

**Desteklenen işlemler**

| İşlem | Undo | Redo |
|--------|------|------|
| Nokta ekleme | API delete | API create |
| Nokta güncelleme | Önceki alanlarla update | Son alanlarla update |
| Nokta silme | API create (yeniden oluştur) | API delete |
| Toplu içe aktarım | Tüm id’leri delete (tek adım) | Tümünü yeniden create |

**Frontend**

- Hook: `frontend/src/hooks/useMapPointHistory.js`
- UI: `UndoRedoControls.jsx` (sağ alt)
- Kısayollar: **Ctrl+Z**, **Ctrl+Y** / **Ctrl+Shift+Z**
- En fazla **50** geçmiş adımı
- Harita + `pointsDataRef` API sonucu ile senkron

**Not:** Silinen nokta undo ile yeniden oluşturulduğunda yeni `Id` atanabilir; sonraki redo/undo bu yeni kimliği kullanır.

---

### 4. Sunucu tarafında bbox filtreli sorgu (tamamlandı)

**Backend:** `MapPointBBoxDto`, repository `GetAllWithinBBoxAsync` / `GetByUserWithinBBoxAsync`, controller query parametreleri.

**Frontend:** `mapBbox.js`, `listMapPoints(bbox)`, `MapView` — `moveend` + debounce ile görünür alan yükleme; `QueryPointsModal` bbox ile liste ve `pointExport.js` ile GeoJSON/CSV indirme.

---

### 5. 10.000+ kayıt performans yaklaşımı (tamamlandı)

**Strateji:** Bbox (madde 4) + sunucu `limit` + toplam sayım / `truncated` bayrağı + istemci zoom eşiği + dinamik cluster.

| Katman | Davranış |
|--------|----------|
| API | `Count` + `Take(limit)`; hafif sorgu (bbox listesinde `Include` yok) |
| Harita | Zoom &lt; 7 → yükleme yok; zoom 7–8 → `limit` 10000; daha yakın → 800–2500 |
| Cluster | Nokta sayısına göre mesafe 45–72 px |
| UI | “Yakınlaştırın” / “X/Y gösteriliyor” uyarıları |

**Test verisi:** [Performans testi](#performans-test-verisi-sql-opsiyonel) (`PERF-*`, rastgele 10k) veya [BAŞARSOFT demo](#başarsoft-demo-verisi-sql-opsiyonel) (`BASAR-*`, yazı şeklinde 10k).

**Frontend:** `mapPerformance.js`, `listMapPoints` → `{ items, truncated, totalCount, … }`.

---

### 6. Basit authentication (tamamlandı)

**Backend**

- `POST /api/auth/login`, `register`, `refresh` (mevcut)
- `GET /api/auth/me` — JWT’den kullanıcı profili
- `POST /api/auth/logout` — refresh token iptali (tek veya tüm oturumlar)
- `RefreshTokenRepository.RevokeAllActiveForUserAsync`

**Frontend**

- `restoreSession()` — sayfa açılışında access/refresh doğrulama
- `client.js` — 401 yanıtında otomatik refresh + istek yenileme
- `logout()` — sunucuda token iptali + `localStorage` temizliği
- `auth:session-expired` olayı — harita ve menü senkronu

---

### 7. Loglama (tamamlandı)

**Serilog**

- Konsol + günlük dönen dosya: `backend/BasarsoftOdev.Api/Logs/log-YYYYMMDD.txt`
- Dosya şablonu: `TraceId`, `UserName`, `SourceContext`, mesaj
- EF Core / Microsoft framework logları `Warning` seviyesinde

**Middleware**

| Bileşen | Görev |
|---------|--------|
| `LoggingScopeMiddleware` | Her istekte `TraceId`, `UserId`, `UserName` → Serilog `LogContext` |
| `RequestLoggingMiddleware` | HTTP method, route, status, süre (ms); 4xx/5xx ve yavaş istekler `Warning`/`Error` |
| `ExceptionHandlingMiddleware` | Hataları aynı bağlam alanlarıyla loglar |

**Yapılandırma** (`appsettings.json` → `Logging`)

| Anahtar | Varsayılan | Açıklama |
|---------|------------|----------|
| `SlowRequestThresholdMs` | 2000 | Bu süreyi aşan istekler `[yavaş]` etiketiyle Warning |
| `SkipPathPrefixes` | `/swagger`, `/health`, … | Gürültü azaltma — bu path’lerde istek logu yok |

**İş mantığı logları (BLL)**

- `AuthService` — giriş başarısız/başarılı, kayıt, çıkış
- `MapPointService` — CRUD, bbox kısaltma (`truncated`), import

**API yanıtı ile eşleştirme:** `ApiResponse.traceId` = HTTP `TraceIdentifier` = log dosyasındaki `[TraceId]`.

> `Logs/` klasörü commit edilmemeli (`.gitignore`).

---

### 8. Unit / integration test (tamamlandı)

**Proje:** `backend/BasarsoftOdev.Tests` — xUnit, FluentAssertions, Moq, `Microsoft.AspNetCore.Mvc.Testing`.

**Test ortamı**

| Bileşen | Davranış |
|---------|----------|
| `CustomWebApplicationFactory` | `UseEnvironment("Testing")`, InMemory veritabanı, `EnsureCreated` + seed |
| `Program.cs` | Testing ortamında migration atlanır |
| `appsettings.Testing.json` | JWT ve Map ayarları (PostgreSQL bağlantısı kullanılmaz) |
| Integration login | Seed kullanıcı: `admin` / `admin` |

**Unit testler** — iş mantığı ve validasyon, veritabanı/mock ile izole.

**Integration testler** — gerçek HTTP pipeline; `ApiResponse<T>` sarmalayıcı ve HTTP durum kodları doğrulanır (ör. nokta oluşturma `201 Created`).

Çalıştırma rehberi (komutlar, beklenen çıktı, sorun giderme): [Kurulum — Unit / integration testleri](#unit--integration-testleri-çalıştırma).

---

## Bilinen Sınırlamalar

- Bbox dışındaki noktalar haritada görünmez; `truncated: true` ise tüm alan yüklenmemiştir — yakınlaştırın veya zoom artırın  
- Çok uzak zoom’da (harita &lt; 7) nokta isteği gönderilmez (`MIN_ZOOM_FOR_POINT_LOAD`)  
- `PERF-*` ve `BASAR-*` test verileri aynı anda haritada karışık görünebilir — genelde birini silin  
- İçe aktarımda tek istekte en fazla 500 nokta  
- GeoJSON/CSV dışa aktarma yalnızca sorgu modalındaki listeden (sunucu tarafı export endpoint yok)  
- Undo/redo yalnızca oturum içi; sayfa yenilenince geçmiş silinir  
- Ölçüm çizimleri veritabanına kaydedilmez  
- Integration testler InMemory DB kullanır; PostgreSQL davranışı (PostGIS, indeks) ayrı doğrulanmalıdır  
- `backend/BasarsoftOdev.Api/Logs/` çalışma zamanı logları commit edilmemeli  

---

## Lisans

Bu proje değerlendirme amaçlı hazırlanmıştır.
