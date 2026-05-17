namespace BasarsoftOdev.Api;

public static class ConnectionStringResolver
{
    public static string Resolve(IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(cs)) return cs;

        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrWhiteSpace(databaseUrl))
            return ParseDatabaseUrl(databaseUrl);

        throw new InvalidOperationException("Connection string bulunamadı.");
    }

    public static string ParseDatabaseUrl(string databaseUrl)
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var database = uri.AbsolutePath.TrimStart('/');
        var internalRailway = uri.Host.Contains("railway.internal", StringComparison.OrdinalIgnoreCase);
        var ssl = internalRailway
            ? "SSL Mode=Disable"
            : "SSL Mode=Require;Trust Server Certificate=true";
        return $"Host={uri.Host};Port={uri.Port};Database={database};Username={username};Password={password};{ssl}";
    }
}
