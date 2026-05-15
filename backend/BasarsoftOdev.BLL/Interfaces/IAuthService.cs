using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<AuthResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default);
}
