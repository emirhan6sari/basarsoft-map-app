namespace BasarsoftOdev.BLL.Common;

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public ApiError? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse<T> Ok(T data, string? traceId = null) => new()
    {
        Success = true,
        Data = data,
        TraceId = traceId,
    };

    public static ApiResponse<T> Fail(string code, string message, string? traceId = null, IDictionary<string, string[]>? validationErrors = null) => new()
    {
        Success = false,
        Error = new ApiError(code, message, validationErrors),
        TraceId = traceId,
    };
}

public sealed record ApiError(string Code, string Message, IDictionary<string, string[]>? ValidationErrors = null);

public static class ErrorCodes
{
    public const string Validation = "VALIDATION_ERROR";
    public const string NotFound = "NOT_FOUND";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";
    public const string Internal = "INTERNAL_ERROR";
    public const string Proximity = "PROXIMITY_WARNING";
    public const string Conflict = "CONFLICT";
}
