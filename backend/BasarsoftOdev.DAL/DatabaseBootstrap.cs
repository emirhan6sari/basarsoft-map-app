using Microsoft.Extensions.Logging;
using Npgsql;

namespace BasarsoftOdev.DAL;

/// <summary>
/// Railway / bozuk PostGIS kurulumlarında veritabanını migration öncesi hazırlar.
/// </summary>
public static class DatabaseBootstrap
{
    private const string PrepareSql = """
        DROP EXTENSION IF EXISTS postgis CASCADE;
        ALTER TABLE IF EXISTS map_points DROP COLUMN IF EXISTS "Location";
        DROP INDEX IF EXISTS "IX_map_points_Location";
        """;

    public static async Task PrepareAsync(string connectionString, ILogger? logger = null)
    {
        try
        {
            var builder = new NpgsqlDataSourceBuilder(connectionString);
            await using var dataSource = builder.Build();
            await using var conn = await dataSource.OpenConnectionAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = PrepareSql;
            await cmd.ExecuteNonQueryAsync();
            logger?.LogInformation("Veritabanı PostGIS/geometry temizliği tamamlandı.");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Veritabanı bootstrap atlandı veya kısmen uygulandı.");
        }
    }

    public static async Task<bool> PingAsync(string connectionString, CancellationToken cancellationToken = default)
    {
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        await using var dataSource = builder.Build();
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1";
        await cmd.ExecuteScalarAsync(cancellationToken);
        return true;
    }
}
