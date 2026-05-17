namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>
/// Uygulama loglarını PostgreSQL <c>app_logs</c> tablosuna doğrudan yazar.
/// Serilog PostgreSQL sink'e ek olarak kullanılır (yapılandırılmış HTTP/iş kuralı logları).
/// </summary>
public interface IAppLogWriter
{
    Task WriteAsync(AppLogEntry entry, CancellationToken cancellationToken = default);
}

public sealed record AppLogEntry(
    string Level,
    string Message,
    string? MessageTemplate = null,
    string? Exception = null,
    string? TraceId = null,
    string? UserId = null,
    string? UserName = null,
    string? SourceContext = null,
    IReadOnlyDictionary<string, object?>? Properties = null);
