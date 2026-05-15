using System.Net;
using System.Security.Claims;
using System.Text.Json;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Exceptions;
using FluentValidation;
using Serilog.Context;

namespace BasarsoftOdev.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
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
