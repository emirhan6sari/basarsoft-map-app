// ============================================================================
// Program.cs — Başarsoft Map API
// ----------------------------------------------------------------------------
// Bu dosya uygulamanın GİRİŞ NOKTASI'dır. ASP.NET Core 6+ ile gelen
// "Minimal Hosting" modeli kullanılıyor; yani Startup.cs yok, tüm servis
// kayıtları ve middleware konfigürasyonu burada.
//
// Akış:
//   1) WebApplicationBuilder oluşturulur
//   2) Konfigürasyon (appsettings + env variables) yüklenir
//   3) Servisler DI container'a eklenir:
//        - Controllers (REST API endpoint'leri için)
//        - Swagger / OpenAPI (geliştirme sırasında API'yi görsel incelemek için)
//        - CORS (frontend'in başka portta çalışırken backend'i çağırabilmesi)
//        - EF Core DbContext (PostgreSQL + PostGIS NetTopologySuite)
//   4) Uygulama build edilir
//   5) HTTP request pipeline (middleware sırası) kurulur
//   6) Uygulama çalıştırılır
// ============================================================================

using BasarsoftOdev.Api.Data;
using BasarsoftOdev.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// CORS politika adı — birden fazla yerde kullanacağımız için sabit tutuyoruz.
// Frontend (Vite dev server varsayılan olarak 5173 portunda) backend'e çağrı
// yaptığında tarayıcı CORS politikası gereği erişimi engeller. Bu politika
// "frontend origin'ime izin ver" demek için kullanılıyor.
// Canlı ortamda Railway URL'i environment variable üzerinden eklenecek.
// ---------------------------------------------------------------------------
const string FrontendCorsPolicy = "FrontendCorsPolicy";

// ---------------------------------------------------------------------------
// CONNECTION STRING ÇÖZÜMLEMESİ
// ----------------------------------------------------------------------------
// 1) Önce ConnectionStrings:DefaultConnection okunur (appsettings.*.json).
// 2) Yoksa veya boşsa, Railway'in sağladığı DATABASE_URL environment variable
//    aranır. Railway DATABASE_URL'i URI biçiminde verir
//    ("postgresql://user:pass@host:port/db"); Npgsql doğrudan kabul etmez.
//    Bu nedenle URI parse edip key=value formatına çeviriyoruz.
// 3) Hiçbiri yoksa açıklayıcı bir hata fırlatılır (sessizce ölmesin).
// ---------------------------------------------------------------------------
string ResolveConnectionString(IConfiguration configuration)
{
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        return connectionString;
    }

    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        // postgresql://username:password@host:port/database  →  Key=Value;...
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var database = uri.AbsolutePath.TrimStart('/');

        // Railway'in PostgreSQL servisi SSL'i destekler/önerir; "Require"
        // kullanarak güvenli bağlantı zorluyoruz. Local'da bu zaten yoksayılır.
        return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
    }

    throw new InvalidOperationException(
        "Veritabanı bağlantı string'i bulunamadı. "
        + "Lütfen appsettings.Development.json içine ConnectionStrings:DefaultConnection ekleyin "
        + "veya DATABASE_URL environment variable tanımlayın.");
}

var resolvedConnectionString = ResolveConnectionString(builder.Configuration);

// ---------------------------------------------------------------------------
// SERVİS KAYITLARI (DI container'a hizmetler ekleniyor)
// ---------------------------------------------------------------------------

// Controller-based API: attribute routing ([Route], [HttpGet] vb.) kullanılacak
// JsonStringEnumConverter: enum alanları JSON'da sayı (0/1/2) değil STRING
// ("Depo"/"Bayi"...) olarak serialize/deserialize edilir. Frontend string gönderir,
// backend string olarak okur. Bu olmadan "Depo" → hata verir.
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Swagger / OpenAPI dokümantasyonu üreten servis.
// AddEndpointsApiExplorer: Minimal API endpoint'lerinin de keşfedilmesini sağlar.
// AddSwaggerGen: Controller'ları tarayıp OpenAPI JSON dokümanını üretir.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Başarsoft Map API",
        Version = "v1",
        Description = "OpenLayers tabanlı web harita uygulaması için REST API. "
                    + "Nokta CRUD işlemleri, mekansal sorgular (buffer/dikdörtgen/poligon), "
                    + "koordinat dönüşümü ve GeoJSON export desteği sunar.",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "Başarsoft İşe Giriş Case"
        }
    });
});

// CORS politikası: Yerelde frontend (Vite) 5173 portunda çalışır.
// İlerleyen adımda canlı ortam için Railway URL'i appsettings.json üzerinden
// eklenebilecek şekilde genişleteceğiz. Şimdilik sade tutuyoruz.
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        // appsettings.json -> "Cors:AllowedOrigins" listesi (canlı için)
        var configuredOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? Array.Empty<string>();

        var allowedOrigins = new[]
        {
            "http://localhost:5173", // Vite dev server (npm run dev)
            "http://localhost:4173"  // Vite preview server (npm run preview)
        }.Concat(configuredOrigins).ToArray();

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// EF Core DbContext kaydı.
// - UseNpgsql: PostgreSQL sağlayıcısı
// - UseNetTopologySuite: PostGIS desteği. Bu çağrı sayesinde C# tarafında
//   Point/Polygon/Geometry tipleri direkt kullanılabilir, EF Core onları
//   geometry(...) sütunlarına otomatik map eder.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(resolvedConnectionString, npgsql =>
    {
        npgsql.UseNetTopologySuite();
    });
});

// Domain servisleri — Controller'lar bu interface'ler üzerinden DB'ye ulaşır.
// Scoped: request başına bir instance (EF Core DbContext ile aynı yaşam süresi).
builder.Services.AddScoped<IMapPointService, MapPointService>();

// ---------------------------------------------------------------------------
// UYGULAMA İNŞA EDİLİYOR
// ---------------------------------------------------------------------------
var app = builder.Build();

// ---------------------------------------------------------------------------
// HTTP REQUEST PIPELINE (Middleware'lerin sırası ÖNEMLİDİR)
// Sıralama: Exception handling → HTTPS → CORS → Auth → Endpoint mapping
// ---------------------------------------------------------------------------

// Swagger UI sadece geliştirme ortamında açık. Canlıya geçince kapanır
// (production'da API dokümanını dışa açmak istemiyoruz; istenirse açabiliriz).
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();           // /swagger/v1/swagger.json üretir
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Başarsoft Map API v1");
        options.RoutePrefix = "swagger"; // http://localhost:5226/swagger
        options.DocumentTitle = "Başarsoft Map API — Swagger UI";
    });
}

// HTTPS redirection: yerel dev'de HTTP profilini kullanırsak HTTPS yok,
// bu yüzden sadece Development DIŞINDA zorluyoruz. Railway ortamında zaten
// reverse proxy (Cloudflare/internal) HTTPS sağlıyor.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS, Authorization'dan ÖNCE çağrılmalı; preflight (OPTIONS) request'lerin
// doğru cevaplanması için bu sıra kritik.
app.UseCors(FrontendCorsPolicy);

app.UseAuthorization();

// Controller endpoint'lerini route'a bağla
app.MapControllers();

// Sağlık kontrolü endpoint'i: Railway gibi platformların "uygulama ayakta mı?"
// sorgusu için faydalı. Ayrıca canlı deploy sonrası "URL çalışıyor mu?" testi
// için tarayıcıdan açıp görebiliriz.
app.MapGet("/", () => Results.Ok(new
{
    name = "Başarsoft Map API",
    status = "running",
    timestamp = DateTime.UtcNow,
    docs = "/swagger"
}))
.WithName("Root")
.WithTags("Health");

// Veritabanı bağlantı testi endpoint'i. Tarayıcıdan açıp veya curl ile
// çağırarak "DB ile gerçekten konuşabiliyor muyuz?" kontrol edebiliriz.
// Bir sonraki adımda gerçek tabloları eklediğimizde, burası daha anlamlı olacak.
app.MapGet("/health/db", async (AppDbContext db) =>
{
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            return Results.Problem("Veritabanına bağlanılamadı.", statusCode: 503);
        }

        // PostGIS sürümünü raw SQL ile çekiyoruz (entity yok henüz).
        var postgisVersion = await db.Database
            .SqlQueryRaw<string>("SELECT PostGIS_Version() AS \"Value\"")
            .FirstOrDefaultAsync();

        return Results.Ok(new
        {
            connected = true,
            postgisVersion = postgisVersion ?? "(bilinmiyor)",
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Veritabanı bağlantı hatası",
            detail: ex.Message,
            statusCode: 500);
    }
})
.WithName("DbHealthCheck")
.WithTags("Health");

app.Run();
