using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

public interface ITokenService
{
    (string AccessToken, DateTime ExpiresAt) CreateAccessToken(ApplicationUser user, IEnumerable<string> roles);
    string CreateRefreshToken();
}
