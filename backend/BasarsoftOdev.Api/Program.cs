using BasarsoftOdev.Api.Extensions;
using BasarsoftOdev.Api.Middleware;
using BasarsoftOdev.DAL;
using BasarsoftOdev.DAL.Data;
using Microsoft.EntityFrameworkCore;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .AddEnvironmentVariables()
        .Build())
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithThreadId()
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    var connectionString = ResolveConnectionString(builder.Configuration);
    var useInMemoryDb = builder.Environment.IsEnvironment("Testing");
    builder.Services.AddApiServices(
        builder.Configuration,
        connectionString,
        useInMemoryDatabase: useInMemoryDb,
        inMemoryDatabaseName: useInMemoryDb ? "BasarsoftIntegrationTests" : null);

    var app = builder.Build();

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

    if (!app.Environment.IsDevelopment())
        app.UseHttpsRedirection();

    app.UseCors(ServiceCollectionExtensions.FrontendCorsPolicy);
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseMiddleware<LoggingScopeMiddleware>();
    app.UseMiddleware<RequestLoggingMiddleware>();
    app.MapControllers();

    app.MapGet("/", () => Results.Ok(new { name = "Başarsoft Map API", status = "running", docs = "/swagger" }));

    app.MapGet("/health/db", async (AppDbContext db) =>
    {
        var ok = await db.Database.CanConnectAsync();
        return ok ? Results.Ok(new { connected = true }) : Results.Problem(statusCode: 503);
    }).AllowAnonymous();

    if (!app.Environment.IsEnvironment("Testing"))
    {
        await app.ApplyMigrationsAsync();
        await app.SeedDatabaseAsync();
    }

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Uygulama başlatılamadı");
}
finally
{
    Log.CloseAndFlush();
}

static string ResolveConnectionString(IConfiguration configuration)
{
    var cs = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(cs)) return cs;

    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var database = uri.AbsolutePath.TrimStart('/');
        return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
    }

    throw new InvalidOperationException("Connection string bulunamadı.");
}

/// <summary>WebApplicationFactory (integration test) için.</summary>
public partial class Program;
