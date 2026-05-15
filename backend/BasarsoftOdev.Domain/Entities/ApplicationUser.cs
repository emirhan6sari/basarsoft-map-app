using Microsoft.AspNetCore.Identity;

namespace BasarsoftOdev.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
