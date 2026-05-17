using System.Security.Claims;
using System.Text.Json;
using BasarsoftOdev.BLL.Interfaces;
using Microsoft.AspNetCore.Http;
using Npgsql;
using NpgsqlTypes;

namespace BasarsoftOdev.DAL.AppLogging;

/// <summary>
/// Serilog sink'ten bağımsız, doğrudan INSERT ile <c>app_logs</c> tablosuna yazar.
/// Sink batch hatalarında bile HTTP ve iş kuralı logları kaybolmaz.
/// </summary>
public sealed class AppLogWriter : IAppLogWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly NpgsqlDataSource _dataSource;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppLogWriter(NpgsqlDataSource dataSource, IHttpContextAccessor httpContextAccessor)
    {
        _dataSource = dataSource;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task WriteAsync(AppLogEntry entry, CancellationToken cancellationToken = default)
    {
        try
        {
            var http = _httpContextAccessor.HttpContext;
            var traceId = entry.TraceId ?? http?.TraceIdentifier;
            var userId = entry.UserId ?? http?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? http?.User.FindFirstValue("sub");
            var userName = entry.UserName ?? http?.User.Identity?.Name
                ?? http?.User.FindFirstValue(ClaimTypes.Name)
                ?? http?.User.FindFirstValue("unique_name");

            string? propertiesJson = null;
            if (entry.Properties is { Count: > 0 })
                propertiesJson = JsonSerializer.Serialize(entry.Properties, JsonOptions);

            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                INSERT INTO app_logs (
                    timestamp, level, message, message_template, exception,
                    trace_id, user_id, user_name, source_context, properties)
                VALUES (
                    @ts, @level, @msg, @template, @ex,
                    @trace, @uid, @uname, @ctx, @props)
                """;
            cmd.Parameters.AddWithValue("ts", DateTimeOffset.UtcNow);
            cmd.Parameters.AddWithValue("level", entry.Level);
            cmd.Parameters.AddWithValue("msg", entry.Message);
            cmd.Parameters.AddWithValue("template", (object?)entry.MessageTemplate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("ex", (object?)entry.Exception ?? DBNull.Value);
            cmd.Parameters.AddWithValue("trace", (object?)traceId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("uid", (object?)userId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("uname", (object?)userName ?? DBNull.Value);
            cmd.Parameters.AddWithValue("ctx", (object?)entry.SourceContext ?? DBNull.Value);

            var propsParam = cmd.Parameters.Add("props", NpgsqlDbType.Jsonb);
            propsParam.Value = propertiesJson is null ? DBNull.Value : propertiesJson;

            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AppLogWriter] Yazma hatası: {ex.Message}");
        }
    }
}

/// <summary>Integration test (InMemory DB) — DB yazımı yok.</summary>
public sealed class NullAppLogWriter : IAppLogWriter
{
    public Task WriteAsync(AppLogEntry entry, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
