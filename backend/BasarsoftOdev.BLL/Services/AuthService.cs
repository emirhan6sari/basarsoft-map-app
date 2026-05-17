using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BasarsoftOdev.BLL.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly JwtSettings _jwt;
    private readonly ILogger<AuthService> _logger;
    private readonly IAppLogWriter _appLogWriter;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService,
        IRefreshTokenRepository refreshTokens,
        IOptions<JwtSettings> jwt,
        ILogger<AuthService> logger,
        IAppLogWriter appLogWriter)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _refreshTokens = refreshTokens;
        _jwt = jwt.Value;
        _logger = logger;
        _appLogWriter = appLogWriter;
    }

    private const string InvalidCredentialsMessage = "Kullanıcı adı veya şifre hatalı.";

    public async Task<ServiceResult<AuthResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByNameAsync(request.UserName);
        if (user is null)
        {
            _logger.LogWarning("Başarısız giriş: kullanıcı bulunamadı ({UserName})", request.UserName);
            await _appLogWriter.WriteAsync(new AppLogEntry(
                "Warning",
                $"Başarısız giriş: kullanıcı bulunamadı ({request.UserName})",
                SourceContext: nameof(AuthService)), cancellationToken);
            return ServiceResult<AuthResponseDto>.Fail(401, ErrorCodes.Unauthorized, InvalidCredentialsMessage);
        }

        var signIn = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!signIn.Succeeded)
        {
            _logger.LogWarning("Başarısız giriş: şifre hatalı ({UserName})", request.UserName);
            await _appLogWriter.WriteAsync(new AppLogEntry(
                "Warning",
                $"Başarısız giriş: şifre hatalı ({request.UserName})",
                SourceContext: nameof(AuthService)), cancellationToken);
            return ServiceResult<AuthResponseDto>.Fail(401, ErrorCodes.Unauthorized, InvalidCredentialsMessage);
        }

        _logger.LogInformation("Başarılı giriş: {UserId} ({UserName})", user.Id, user.UserName);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"Başarılı giriş: {user.UserName}",
            SourceContext: nameof(AuthService),
            UserId: user.Id.ToString(),
            UserName: user.UserName), cancellationToken);
        var tokens = await IssueTokensAsync(user, cancellationToken);
        return ServiceResult<AuthResponseDto>.Ok(tokens);
    }

    private const string UsernameTakenMessage =
        "Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.";

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken = default)
    {
        var userName = request.UserName.Trim();
        await EnsureUserNameAvailableAsync(userName, cancellationToken);

        var user = new ApplicationUser
        {
            UserName = userName,
            Email = $"{userName}@local.basarsoft",
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? userName : request.DisplayName.Trim(),
        };

        // UserManager.CreateAsync şifreyi otomatik hash'leyerek DB'ye yazar
        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            if (createResult.Errors.Any(e => e.Code == "DuplicateUserName"))
                throw new BusinessException(Common.ErrorCodes.Conflict, UsernameTakenMessage, statusCode: 409);

            var msg = string.Join(" ", createResult.Errors.Select(e => e.Description));
            throw new BusinessException(Common.ErrorCodes.Validation, msg, statusCode: 400);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, "User");
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            var msg = string.Join(" ", roleResult.Errors.Select(e => e.Description));
            throw new BusinessException(Common.ErrorCodes.Internal, msg, statusCode: 500);
        }

        _logger.LogInformation("Yeni kullanıcı kaydı: {UserId} ({UserName})", user.Id, user.UserName);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"Yeni kullanıcı kaydı: {user.UserName}",
            SourceContext: nameof(AuthService),
            UserId: user.Id.ToString(),
            UserName: user.UserName), cancellationToken);
        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default)
    {
        var stored = await _refreshTokens.GetByTokenAsync(request.RefreshToken, cancellationToken);
        if (stored is null || !stored.IsActive)
            throw new UnauthorizedBusinessException("Geçersiz veya süresi dolmuş refresh token.");

        var user = stored.User;
        await _refreshTokens.RevokeAsync(stored, cancellationToken: cancellationToken);
        return await IssueTokensAsync(user, cancellationToken);
    }

    public async Task<UserProfileDto> GetMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            throw new UnauthorizedBusinessException("Oturum geçersiz.");

        var roles = await _userManager.GetRolesAsync(user);
        return new UserProfileDto
        {
            Id = user.Id,
            UserName = user.UserName ?? string.Empty,
            DisplayName = user.DisplayName,
            Roles = roles.ToList(),
        };
    }

    public async Task LogoutAsync(Guid userId, string? refreshToken, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var stored = await _refreshTokens.GetByTokenAsync(refreshToken, cancellationToken);
            if (stored is not null && stored.UserId == userId && stored.IsActive)
                await _refreshTokens.RevokeAsync(stored, cancellationToken: cancellationToken);
        }
        else
        {
            await _refreshTokens.RevokeAllActiveForUserAsync(userId, cancellationToken);
        }

        await _refreshTokens.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Çıkış: {UserId}", userId);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"Çıkış: {userId}",
            SourceContext: nameof(AuthService),
            UserId: userId.ToString()), cancellationToken);
    }

    private async Task EnsureUserNameAvailableAsync(string userName, CancellationToken cancellationToken)
    {
        var existing = await _userManager.FindByNameAsync(userName);
        if (existing is not null)
            throw new BusinessException(Common.ErrorCodes.Conflict, UsernameTakenMessage, statusCode: 409);
    }

    private async Task<AuthResponseDto> IssueTokensAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var (access, accessExp) = _tokenService.CreateAccessToken(user, roles);
        var refresh = _tokenService.CreateRefreshToken();
        var refreshExp = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);

        await _refreshTokens.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            Token = refresh,
            ExpiresAt = refreshExp,
        }, cancellationToken);

        await _refreshTokens.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            AccessToken = access,
            RefreshToken = refresh,
            AccessTokenExpiresAt = accessExp,
            RefreshTokenExpiresAt = refreshExp,
            Roles = roles.ToList(),
            UserName = user.UserName ?? string.Empty,
            DisplayName = user.DisplayName,
        };
    }
}
