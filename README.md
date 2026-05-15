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
- [Kimlik Doğrulama (JWT)](#kimlik-doğrulama-jwt)
- [REST API](#rest-api)
- [Konfigürasyon](#konfigürasyon)
- [Veritabanı Yedeği](#veritabanı-yedeği)
- [Canlı Yayın (Railway)](#canlı-yayın-railway)
- [Bilinen Sınırlamalar](#bilinen-sınırlamalar)

---

## Özellikler

### Tamamlanan

- [x] Tam ekran harita (OpenStreetMap, Türkiye odaklı başlangıç zoom’u)
- [x] Mouse konumuna göre anlık **EPSG:4326** koordinat gösterimi (alt orta)
- [x] Nokta ekleme: modal ile **ad, numara, açıklama, kategori** (Depo / Bayi / Musteri / Ofis)
- [x] Backend’den nokta listeleme ve haritada gösterme
- [x] Yakın nokta uyarısı (**50 m** — hem frontend hem API `PROXIMITY_WARNING`)
- [x] Katman paneli (OSM tabanı, nokta katmanı görünürlüğü)
- [x] Üst orta açılır menü (Add Point / Query Points / Layers — *Query henüz placeholder*)
- [x] JWT + refresh token, roller: **Admin**, **Manager**, **User**
- [x] Veritabanında **4326 ve 3857** koordinatların birlikte saklanması; eksik format otomatik tamamlanır
- [x] Standart API yanıtı: `ApiResponse<T>` (`success`, `data`, `error`, `traceId`)
- [x] Serilog (konsol + dosya), FluentValidation, global exception middleware

### Planlanan / kısmen

- [ ] Cluster ile nokta gösterimi
- [ ] Kategoriye göre farklı simge/stil
- [ ] Popup ile güncelleme ve silme
- [ ] Mekansal sorgular (buffer, dikdörtgen, poligon)
- [ ] GeoJSON / CSV dışa aktarma
- [ ] Ayrı login ekranı (şu an geliştirmede otomatik admin girişi)

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
| **Api** | Controller, middleware, DI, Swagger, Serilog pipeline |

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
│   ├── BasarsoftOdev.Api/          # REST, middleware, Program.cs
│   ├── BasarsoftOdev.BLL/          # Servisler, DTO, validator
│   ├── BasarsoftOdev.DAL/          # DbContext, repository, Migrations/
│   └── BasarsoftOdev.Domain/       # Entity ve enum’lar
├── frontend/                       # React + Vite + OpenLayers
│   └── src/
│       ├── api/                    # auth.js, client.js, mapPoints.js
│       └── components/             # MapView, AddPointModal, LayersPanel, …
├── database/                       # pg_dump yedekleri (teslim için)
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

İlk çalıştırmada seed: roller (**Admin**, **Manager**, **User**) ve varsayılan kullanıcı **`admin` / `Admin123!`** (yalnızca geliştirme).

> **Not:** Çalışan `BasarsoftOdev.Api` süreci varken `dotnet build` dosya kilidi verebilir. `Get-Process -Name BasarsoftOdev.Api | Stop-Process -Force`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

| Servis | URL |
|--------|-----|
| Uygulama | http://localhost:5173 |

Geliştirmede `src/api/auth.js` içindeki `ensureAuthenticated()` token yoksa otomatik `admin` ile giriş dener. Üretimde bu davranış kaldırılmalıdır.

---

## Kimlik Doğrulama (JWT)

### Giriş

```http
POST /api/auth/login
Content-Type: application/json

{
  "userName": "admin",
  "password": "Admin123!"
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

### Swagger

**Authorize** → `Bearer {accessToken}` (kelime *Bearer* dahil).

### Rol yetkileri (MapPoints)

| İşlem | Roller |
|--------|--------|
| GET (liste / tekil) | Admin, Manager, User |
| POST (oluştur) | Admin, Manager, User |
| PUT (güncelle) | Admin, Manager |
| DELETE | Admin |

---

## REST API

Tüm korumalı uçlar `Authorization: Bearer {token}` gerektirir. Başarılı gövde genelde `ApiResponse<T>` formatındadır.

### MapPoints

| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/MapPoints` | Tüm noktalar |
| GET | `/api/MapPoints/{id}` | Tekil |
| POST | `/api/MapPoints` | Yeni nokta |
| PUT | `/api/MapPoints/{id}` | Güncelle |
| DELETE | `/api/MapPoints/{id}` | Sil (Admin) |

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

### Auth

| Method | URL | Auth |
|--------|-----|------|
| POST | `/api/auth/login` | Hayır |
| POST | `/api/auth/refresh` | Hayır |

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
| `Cors:AllowedOrigins` | Ek frontend origin’leri |

Ortam değişkeni örneği: `ConnectionStrings__DefaultConnection`, `Jwt__SecretKey`.

### Frontend

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `VITE_API_BASE_URL` | API kök URL | `http://localhost:5226` |

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

Manuel şema yükseltme (nadir): `backend/BasarsoftOdev.DAL/Data/Migrations/Scripts/upgrade_layered.sql`

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

## Bilinen Sınırlamalar

- Geliştirme ortamında otomatik `admin` girişi; üretim için login UI gerekli  
- Mekansal sorgu, cluster, export ve popup CRUD henüz tamamlanmadı  
- Unit / integration test kapsamı sınırlı  
- `backend/BasarsoftOdev.Api/Logs/` çalışma zamanı logları commit edilmemeli  

---

## Lisans

Bu proje değerlendirme amaçlı hazırlanmıştır.
