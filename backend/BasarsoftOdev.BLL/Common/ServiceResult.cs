namespace BasarsoftOdev.BLL.Common;

/// <summary>Beklenen iş kuralı hatalarında exception fırlatmak yerine sonuç döner.</summary>
public sealed class ServiceResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public int StatusCode { get; init; } = 200;

    public static ServiceResult<T> Ok(T data) => new() { Success = true, Data = data };

    public static ServiceResult<T> Fail(int statusCode, string errorCode, string message) => new()
    {
        Success = false,
        StatusCode = statusCode,
        ErrorCode = errorCode,
        ErrorMessage = message,
    };
}
