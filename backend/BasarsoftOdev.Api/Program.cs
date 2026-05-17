using BasarsoftOdev.Api;
using BasarsoftOdev.Api.Extensions;
using BasarsoftOdev.Api.HostedServices;
using BasarsoftOdev.Api.Middleware;
using BasarsoftOdev.DAL;
using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;
using Serilog;
using Serilog.Events;
using Serilog.Sinks.PostgreSQL;
using Serilog.Sinks.PostgreSQL.ColumnWriters;

// ---------------------------------------------------------------------------
// Bootstrap Serilog logger — yapılandırma okunmadan önce hata loglayabilmek için
// minimum (Console) bir logger kurulur. Uygulama hazır olunca PostgreSQL sink
// ile yeniden konfigüre edilir (bkz. ConfigureSerilog).
// ---------------------------------------------------------------------------
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Railway: container içindeki port env'den okunur, dışarıdan TLS ile sunulur.
    var port = Environment.GetEnvironmentVariable("PORT");
    if (!string.IsNullOrWhiteSpace(port))
        builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

    var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);
    var useInMemoryDb = builder.Environment.IsEnvironment("Testing");

    // ---------------------------------------------------------------------------
    // Serilog'u veritabanı sink'i ile yeniden konfigüre et:
    //   - Console     → her ortamda (Railway log streaming, dev terminal)
    //   - PostgreSQL  → 'app_logs' tablosuna yapılandırılmış log (sadece üretim/dev)
    //   - Testing     → DB sink atlanır (InMemory DB; sink desteklemez)
    //
    // 'needAutoCreateTable: true' → tablo yoksa ilk yazımda otomatik oluşturulur.
    // Loglar Serilog enrichment'ları (TraceId, UserId, UserName, SourceContext)
    // ile birlikte yapılandırılmış halde yazılır; 'properties' sütununda JSONB
    // olarak tüm structured payload saklanır.
    // ---------------------------------------------------------------------------
    ConfigureSerilog(builder, connectionString, useInMemoryDb);

    builder.Services.AddApiServices(
        builder.Configuration,
        connectionString,
        useInMemoryDatabase: useInMemoryDb,
        inMemoryDatabaseName: useInMemoryDb ? "BasarsoftIntegrationTests" : null);

    if (!useInMemoryDb)
        builder.Services.AddHostedService<DatabaseInitializerHostedService>();

    var app = builder.Build();

    // İstisna yakalama middleware'i ilk sırada — alt katmanlardaki tüm hataları
    // ApiResponse formatında dönmek ve loglamak için.
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(o =>
        {
            o.SwaggerEndpoint("/swagger/v1/swagger.json", "Başarsoft Map API v1");
            o.RoutePrefix = "swagger";
        });
    }

    // Railway: TLS edge'de; container içi HTTP healthcheck — HTTPS yönlendirme kapalı
    app.UseCors(ServiceCollectionExtensions.FrontendCorsPolicy);
    app.UseAuthentication();
    app.UseAuthorization();
    // Authentication SONRASI: user/trace bilgisini Serilog LogContext'e ekler.
    // RequestLoggingMiddleware aşağıdadır; ikisi birlikte yapılandırılmış istek
    // logu üretir (HTTP method, route, status, süre + trace + kullanıcı).
    app.UseMiddleware<LoggingScopeMiddleware>();
    app.UseMiddleware<RequestLoggingMiddleware>();
    app.MapControllers();

    app.MapGet("/", () => Results.Ok(new
    {
        name = "Başarsoft Map API",
        status = "running",
        docs = "/swagger",
        build = "railway-20260517b",
    }));

    app.MapGet("/health/db", async (IConfiguration configuration, ILogger<Program> logger) =>
    {
        try
        {
            var cs = ConnectionStringResolver.Resolve(configuration);
            await DatabaseBootstrap.PrepareAsync(cs, logger);
            await DatabaseBootstrap.PingAsync(cs);
            return Results.Ok(new
            {
                connected = true,
                check = NpgsqlConnectionHelper.HealthCheckMarker,
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                title: "Veritabanı bağlantı hatası",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }).AllowAnonymous();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Uygulama başlatılamadı");
}
finally
{
    // Tampondaki log batch'lerini DB'ye gönder ve sink'leri kapat.
    Log.CloseAndFlush();
}

// ---------------------------------------------------------------------------
// Serilog yapılandırması — Console + PostgreSQL DB sink
// ---------------------------------------------------------------------------
static void ConfigureSerilog(WebApplicationBuilder builder, string connectionString, bool useInMemoryDb)
{
    var loggerConfig = new LoggerConfiguration()
        .ReadFrom.Configuration(builder.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithThreadId();

    // Test ortamı (InMemory DB) → yalnızca Console (DB sink kullanılmaz)
    if (!useInMemoryDb && !string.IsNullOrWhiteSpace(connectionString))
    {
        // app_logs tablosu sütunları — yapılandırılmış log alanları
        var columnWriters = new Dictionary<string, ColumnWriterBase>(StringComparer.OrdinalIgnoreCase)
        {
            { "timestamp", new TimestampColumnWriter(NpgsqlDbType.TimestampTz) },
            { "level", new LevelColumnWriter(true, NpgsqlDbType.Varchar) },
            { "message", new RenderedMessageColumnWriter(NpgsqlDbType.Text) },
            { "message_template", new MessageTemplateColumnWriter(NpgsqlDbType.Text) },
            { "exception", new ExceptionColumnWriter(NpgsqlDbType.Text) },
            { "trace_id", new SinglePropertyColumnWriter("TraceId", PropertyWriteMethod.Raw, NpgsqlDbType.Varchar) },
            { "user_id", new SinglePropertyColumnWriter("UserId", PropertyWriteMethod.Raw, NpgsqlDbType.Varchar) },
            { "user_name", new SinglePropertyColumnWriter("UserName", PropertyWriteMethod.Raw, NpgsqlDbType.Varchar) },
            { "source_context", new SinglePropertyColumnWriter("SourceContext", PropertyWriteMethod.Raw, NpgsqlDbType.Varchar) },
            { "properties", new LogEventSerializedColumnWriter(NpgsqlDbType.Jsonb) },
        };

        loggerConfig.WriteTo.PostgreSQL(
            connectionString: connectionString,
            tableName: "app_logs",
            columnOptions: columnWriters,
            needAutoCreateTable: true,
            useCopy: false,
            schemaName: "public",
            restrictedToMinimumLevel: LogEventLevel.Information,
            batchSizeLimit: 50,
            period: TimeSpan.FromSeconds(5));
    }

    Log.Logger = loggerConfig.CreateLogger();
    builder.Host.UseSerilog();
}

/// <summary>WebApplicationFactory (integration test) için.</summary>
public partial class Program;
