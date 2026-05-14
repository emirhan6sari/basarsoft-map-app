// ============================================================================
// Program.cs — Başarsoft Map API
// ----------------------------------------------------------------------------
// Bu dosya uygulamanın GİRİŞ NOKTASI'dır. ASP.NET Core 6+ ile gelen
// "Minimal Hosting" modeli kullanılıyor; yani Startup.cs yok, tüm servis
// kayıtları ve middleware konfigürasyonu burada.
//
// Akış:
//   1) WebApplicationBuilder oluşturulur
//   2) Servisler DI (Dependency Injection) container'a eklenir:
//        - Controllers (REST API endpoint'leri için)
//        - Swagger / OpenAPI (geliştirme sırasında API'yi görsel incelemek için)
//        - CORS (frontend'in başka portta çalışırken backend'i çağırabilmesi)
//   3) Uygulama build edilir
//   4) HTTP request pipeline (middleware sırası) kurulur
//   5) Uygulama çalıştırılır
// ============================================================================

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
// SERVİS KAYITLARI (DI container'a hizmetler ekleniyor)
// ---------------------------------------------------------------------------

// Controller-based API: attribute routing ([Route], [HttpGet] vb.) kullanılacak
builder.Services.AddControllers();

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
        policy.WithOrigins(
                  "http://localhost:5173", // Vite dev server (npm run dev)
                  "http://localhost:4173"  // Vite preview server (npm run preview)
              )
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

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

app.Run();
