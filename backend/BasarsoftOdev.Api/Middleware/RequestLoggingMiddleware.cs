using System.Diagnostics;
using BasarsoftOdev.Api.Options;
using BasarsoftOdev.BLL.Interfaces;
using Microsoft.Extensions.Options;

namespace BasarsoftOdev.Api.Middleware;

/// <summary>
/// Her HTTP isteğinin tamamlanma süresini ve durum kodunu loglar.
/// Serilog (Console) + <see cref="IAppLogWriter"/> (PostgreSQL app_logs) birlikte kullanılır.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly IAppLogWriter _appLogWriter;
    private readonly LoggingSettings _settings;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger,
        IAppLogWriter appLogWriter,
        IOptions<LoggingSettings> settings)
    {
        _next = next;
        _logger = logger;
        _appLogWriter = appLogWriter;
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
            await LogCompletedAsync(context, method, route, sw.ElapsedMilliseconds);
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

    private async Task LogCompletedAsync(HttpContext context, string method, string route, long elapsedMs)
    {
        var status = context.Response.StatusCode;
        var slow = elapsedMs >= _settings.SlowRequestThresholdMs;
        var slowTag = slow ? " [yavaş]" : string.Empty;

        string level;
        string message;
        if (status >= 500)
        {
            level = "Error";
            message = $"HTTP {method} {route} → {status} ({elapsedMs} ms)";
            _logger.LogError("HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms)", method, route, status, elapsedMs);
        }
        else if (status >= 400 || slow)
        {
            level = "Warning";
            message = $"HTTP {method} {route} → {status} ({elapsedMs} ms){slowTag}";
            _logger.LogWarning(
                "HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms){SlowTag}",
                method, route, status, elapsedMs, slowTag);
        }
        else
        {
            level = "Information";
            message = $"HTTP {method} {route} → {status} ({elapsedMs} ms)";
            _logger.LogInformation(
                "HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms)",
                method, route, status, elapsedMs);
        }

        await _appLogWriter.WriteAsync(new AppLogEntry(
            Level: level,
            Message: message,
            MessageTemplate: "HTTP {Method} {Route} → {StatusCode} ({ElapsedMs} ms)",
            SourceContext: nameof(RequestLoggingMiddleware),
            Properties: new Dictionary<string, object?>
            {
                ["Method"] = method,
                ["Route"] = route,
                ["StatusCode"] = status,
                ["ElapsedMs"] = elapsedMs,
                ["Slow"] = slow,
            }));
    }
}
