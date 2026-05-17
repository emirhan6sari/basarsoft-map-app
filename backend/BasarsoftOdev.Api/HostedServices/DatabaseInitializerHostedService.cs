using BasarsoftOdev.DAL;

namespace BasarsoftOdev.Api.HostedServices;

/// <summary>Migration/seed — Kestrel ayağa kalktıktan sonra çalışır (Railway healthcheck için).</summary>
public sealed class DatabaseInitializerHostedService(
    IHost host,
    IConfiguration configuration,
    ILogger<DatabaseInitializerHostedService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var cs = ConnectionStringResolver.Resolve(configuration);
            await DatabaseBootstrap.PrepareAsync(cs, logger);
            await host.ApplyMigrationsAsync();
            await host.SeedDatabaseAsync();
            logger.LogInformation("Veritabanı migration ve seed tamamlandı.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Veritabanı başlatma başarısız — API ayakta, /health/db detay verir.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
