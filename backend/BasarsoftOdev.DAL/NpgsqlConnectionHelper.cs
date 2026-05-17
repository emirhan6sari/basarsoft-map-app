using Npgsql;

namespace BasarsoftOdev.DAL;

/// <summary>
/// Railway gibi PostGIS kurulmamış veya bozuk PostgreSQL örneklerinde bağlantı açılışını güvenli kılar.
/// </summary>
public static class NpgsqlConnectionHelper
{
    public const string HealthCheckMarker = "no-type-loading-v2";

    public static string NormalizeConnectionString(string connectionString)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
#pragma warning disable CS0618
        builder.ServerCompatibilityMode = ServerCompatibilityMode.NoTypeLoading;
#pragma warning restore CS0618
        return builder.ConnectionString;
    }

    public static NpgsqlDataSource CreateDataSource(string connectionString)
    {
        var builder = new NpgsqlDataSourceBuilder(NormalizeConnectionString(connectionString));
        builder.ConfigureTypeLoading(x => x.EnableTypeLoading(false));
        return builder.Build();
    }
}
