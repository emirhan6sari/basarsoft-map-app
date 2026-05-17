using System.Net;
using System.Security.Claims;
using System.Text.Json;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using FluentValidation;
using Serilog.Context;

namespace BasarsoftOdev.Api.Middleware;

/// <summary>
/// Global hata yakalayıcı. Pipeline'da en üstte çalışır:
///   - FluentValidation.ValidationException → 400 + alan bazlı validationErrors
///   - BLL BusinessException → exception içindeki StatusCode/Code/Message
///   - Diğer (beklenmeyen) → 500 + ErrorCodes.Internal
///
/// Her hata `app_logs` tablosuna (Serilog PostgreSQL sink) ve Console'a
/// yazılır; TraceId / UserId / UserName log scope'a eklenir. Client'a daima
/// ApiResponse<T> formatında JSON döner — stack trace dışarı sızdırılmaz.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IAppLogWriter _appLogWriter;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IAppLogWriter appLogWriter)
    {
        _next = next;
        _logger = logger;
        _appLogWriter = appLogWriter;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var traceId = context.TraceIdentifier;
        var (status, response) = MapException(ex, traceId);

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub")
            ?? "anonymous";
        var userName = context.User.Identity?.Name
            ?? context.User.FindFirstValue(ClaimTypes.Name)
            ?? "anonymous";

        using (LogContext.PushProperty("TraceId", traceId))
        using (LogContext.PushProperty("UserId", userId))
        using (LogContext.PushProperty("UserName", userName))
        {
            if (status >= 500)
                _logger.LogError(ex, "İşlenmeyen hata");
            else
                _logger.LogWarning(ex, "İş kuralı/validasyon hatası: {ErrorType}", ex.GetType().Name);
        }

        var level = status >= 500 ? "Error" : "Warning";
        await _appLogWriter.WriteAsync(new AppLogEntry(
            Level: level,
            Message: status >= 500 ? "İşlenmeyen hata" : $"İş kuralı/validasyon hatası: {ex.GetType().Name}",
            Exception: ex.ToString(),
            TraceId: traceId,
            UserId: userId,
            UserName: userName,
            SourceContext: nameof(ExceptionHandlingMiddleware)));

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = status;

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
        await context.Response.WriteAsync(json);
    }

    private static (int Status, ApiResponse<object?> Response) MapException(Exception ex, string traceId)
    {
        return ex switch
        {
            ValidationException ve => (
                (int)HttpStatusCode.BadRequest,
                ApiResponse<object?>.Fail(
                    ErrorCodes.Validation,
                    "Doğrulama hatası.",
                    traceId,
                    ve.Errors.GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))),

            BusinessException be => (
                be.StatusCode,
                ApiResponse<object?>.Fail(be.Code, be.Message, traceId)),

            _ => (
                (int)HttpStatusCode.InternalServerError,
                ApiResponse<object?>.Fail(ErrorCodes.Internal, "Beklenmeyen bir hata oluştu.", traceId)),
        };
    }
}
