using Microsoft.Extensions.Logging;
using Npgsql;

namespace BasarsoftOdev.DAL;

/// <summary>
/// Railway vb. ortamlarda yarım kalmış PostGIS kaydını temizler (postgis_version hatası).
/// </summary>
public static class PostgisCleanup
{
    public static async Task DropIfPresentAsync(string connectionString, ILogger? logger = null)
    {
        try
        {
            await using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "DROP EXTENSION IF EXISTS postgis CASCADE;";
            await cmd.ExecuteNonQueryAsync();
            logger?.LogInformation("PostGIS extension kaldırıldı (varsa).");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "PostGIS extension kaldırılamadı; devam ediliyor.");
        }
    }
}
