using Microsoft.Extensions.Logging;

namespace BasarsoftOdev.DAL;

/// <summary>
/// Railway / bozuk PostGIS kurulumlarında veritabanını migration öncesi hazırlar.
/// </summary>
public static class DatabaseBootstrap
{
    private const string PrepareSql = """
        DROP EXTENSION IF EXISTS postgis CASCADE;
        DROP EXTENSION IF EXISTS postgis_topology CASCADE;
        DROP EXTENSION IF EXISTS postgis_raster CASCADE;
        ALTER TABLE IF EXISTS map_points DROP COLUMN IF EXISTS "Location";
        DROP INDEX IF EXISTS "IX_map_points_Location";

        CREATE TABLE IF NOT EXISTS map_points (
            "Id" uuid NOT NULL PRIMARY KEY,
            "Name" character varying(200) NOT NULL DEFAULT '',
            "Number" character varying(50) NOT NULL DEFAULT '',
            "Description" character varying(2000),
            "Category" character varying(32) NOT NULL DEFAULT '',
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
        );
        """;

    public static async Task PrepareAsync(string connectionString, ILogger? logger = null)
    {
        try
        {
            await using var dataSource = NpgsqlConnectionHelper.CreateDataSource(connectionString);
            await using var conn = await dataSource.OpenConnectionAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = PrepareSql;
            await cmd.ExecuteNonQueryAsync();
            logger?.LogInformation("Veritabanı bootstrap (PostGIS temizliği / map_points) tamamlandı.");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Veritabanı bootstrap atlandı veya kısmen uygulandı.");
        }
    }

    public static async Task<bool> PingAsync(string connectionString, CancellationToken cancellationToken = default)
    {
        await using var dataSource = NpgsqlConnectionHelper.CreateDataSource(connectionString);
        await using var conn = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1";
        await cmd.ExecuteScalarAsync(cancellationToken);
        return true;
    }
}
