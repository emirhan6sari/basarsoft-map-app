using System.Diagnostics;

namespace BasarsoftOdev.Api.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        var method = context.Request.Method;
        var path = context.Request.Path;

        _logger.LogInformation("HTTP {Method} {Path} başladı", method, path);

        await _next(context);

        sw.Stop();
        _logger.LogInformation(
            "HTTP {Method} {Path} tamamlandı → {StatusCode} ({Elapsed} ms)",
            method, path, context.Response.StatusCode, sw.ElapsedMilliseconds);
    }
}
