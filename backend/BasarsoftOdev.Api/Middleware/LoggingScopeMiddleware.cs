using System.Security.Claims;
using Serilog.Context;

namespace BasarsoftOdev.Api.Middleware;

/// <summary>
/// Her HTTP isteği için Serilog LogContext'e TraceId ve kullanıcı bilgisi ekler.
/// Authentication sonrasında çalıştırılmalıdır.
/// </summary>
public class LoggingScopeMiddleware
{
    private readonly RequestDelegate _next;

    public LoggingScopeMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = context.TraceIdentifier;
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub");
        var userName = context.User.Identity?.Name
            ?? context.User.FindFirstValue(ClaimTypes.Name)
            ?? context.User.FindFirstValue("unique_name");

        using (LogContext.PushProperty("TraceId", traceId))
        using (LogContext.PushProperty("UserId", string.IsNullOrEmpty(userId) ? "anonymous" : userId))
        using (LogContext.PushProperty("UserName", string.IsNullOrEmpty(userName) ? "anonymous" : userName))
        {
            await _next(context);
        }
    }
}
