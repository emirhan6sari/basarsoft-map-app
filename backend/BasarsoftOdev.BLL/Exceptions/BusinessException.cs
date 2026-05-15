namespace BasarsoftOdev.BLL.Exceptions;

public class BusinessException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }

    public BusinessException(string code, string message, int statusCode = 400)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}

public class NotFoundException : BusinessException
{
    public NotFoundException(string message)
        : base(Common.ErrorCodes.NotFound, message, statusCode: 404) { }
}

public class UnauthorizedBusinessException : BusinessException
{
    public UnauthorizedBusinessException(string message)
        : base(Common.ErrorCodes.Unauthorized, message, statusCode: 401) { }
}

public class ForbiddenBusinessException : BusinessException
{
    public ForbiddenBusinessException(string message)
        : base(Common.ErrorCodes.Forbidden, message, statusCode: 403) { }
}
