using Npgsql;

namespace BasarsoftOdev.DAL;

/// <summary>
/// Railway gibi PostGIS kurulmamış veya bozuk PostgreSQL örneklerinde bağlantı açılışını güvenli kılar.
/// </summary>
public static class NpgsqlConnectionHelper
{
    public static NpgsqlDataSource CreateDataSource(string connectionString)
    {
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        builder.ConfigureTypeLoading(x => x.EnableTypeLoading(false));
        return builder.Build();
    }
}
