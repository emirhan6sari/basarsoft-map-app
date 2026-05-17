using BasarsoftOdev.Api;
using BasarsoftOdev.Api.Extensions;
using BasarsoftOdev.Api.HostedServices;
using BasarsoftOdev.Api.Middleware;
using BasarsoftOdev.DAL;
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

    var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);
    var useInMemoryDb = builder.Environment.IsEnvironment("Testing");
    builder.Services.AddApiServices(
        builder.Configuration,
        connectionString,
        useInMemoryDatabase: useInMemoryDb,
        inMemoryDatabaseName: useInMemoryDb ? "BasarsoftIntegrationTests" : null);

    if (!useInMemoryDb)
        builder.Services.AddHostedService<DatabaseInitializerHostedService>();

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
    Log.CloseAndFlush();
}

/// <summary>WebApplicationFactory (integration test) için.</summary>
public partial class Program;
