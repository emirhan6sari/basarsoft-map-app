using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BasarsoftOdev.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    /// <summary>JWT access + refresh token üretir.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _auth.LoginAsync(request, cancellationToken);
        if (!result.Success)
        {
            return StatusCode(
                result.StatusCode,
                ApiResponse<AuthResponseDto>.Fail(
                    result.ErrorCode ?? ErrorCodes.Unauthorized,
                    result.ErrorMessage ?? InvalidCredentialsMessage,
                    HttpContext.TraceIdentifier));
        }

        return Ok(ApiResponse<AuthResponseDto>.Ok(result.Data!, HttpContext.TraceIdentifier));
    }

    private const string InvalidCredentialsMessage = "Kullanıcı adı veya şifre hatalı.";

    /// <summary>Yeni kullanıcı kaydı — şifre hash'lenir, rol: User.</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Register(
        [FromBody] RegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _auth.RegisterAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, HttpContext.TraceIdentifier));
    }

    /// <summary>Refresh token ile yeni access token alır.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<AuthResponseDto>>> Refresh(
        [FromBody] RefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _auth.RefreshAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthResponseDto>.Ok(result, HttpContext.TraceIdentifier));
    }
}
