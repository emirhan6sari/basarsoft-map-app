using System.Diagnostics;
using BasarsoftOdev.Api.Options;
using Microsoft.Extensions.Options;

namespace BasarsoftOdev.Api.Middleware;

/// <summary>
/// Her HTTP isteğinin tamamlanma süresini ve durum kodunu yapılandırılmış
/// Serilog logu olarak yazar. Bu loglar Serilog sink'leri tarafından
/// 'app_logs' tablosuna (PostgreSQL) ve Console'a iletilir.
///
/// Davranış:
///   - 5xx → LogError    (her zaman üretim alarmı için)
///   - 4xx veya yavaş istek (Logging:SlowRequestThresholdMs üstü) → LogWarning
///   - Diğer → LogInformation
///   - Logging:SkipPathPrefixes ile eşleşen yollar (örn. /swagger, /health) atlanır
///
/// LoggingScopeMiddleware ile eşleşir: TraceId / UserName otomatik olarak
/// her log satırına eklenir (LogContext.PushProperty).
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly LoggingSettings _settings;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger,
        IOptions<LoggingSettings> settings)
    {
        _next = next;
        _logger = logger;
        _settings = settings.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        if (ShouldSkip(path))
        {
            await _next(context);
            return;
        }

        var sw = Stopwatch.StartNew();
        var method = context.Request.Method;
        var route = DescribeRoute(path);

        try
        {
            await _next(context);
            sw.Stop();
            LogCompleted(context, method, route, sw.ElapsedMilliseconds);
        }
        catch
        {
            sw.Stop();
            throw;
        }
    }

    private bool ShouldSkip(string path)
    {
        foreach (var prefix in _settings.SkipPathPrefixes)
        {
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private static string DescribeRoute(string path)
    {
        if (path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
            return "/api/auth/*";

        return path;
    }

    private void LogCompleted(HttpContext context, string method, string route, long elapsedMs)
    {
        var status = context.Response.StatusCode;
        var slow = elapsedMs >= _settings.SlowRequestThresholdMs;

        if (status >= 500)
        {
            _logger.LogError(
                "HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms)",
                method, route, status, elapsedMs);
            return;
        }

        if (status >= 400 || slow)
        {
            _logger.LogWarning(
                "HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms){SlowTag}",
                method, route, status, elapsedMs,
                slow ? " [yavaş]" : string.Empty);
            return;
        }

        _logger.LogInformation(
            "HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms)",
            method, route, status, elapsedMs);
    }
}
