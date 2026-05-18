namespace BasarsoftOdev.BLL.Common;

/// <summary>Harita noktası yetki ve liste sorguları için kullanıcı bağlamı.</summary>
public sealed class MapPointAccessContext
{
    public required Guid UserId { get; init; }
    public IReadOnlyList<string> Roles { get; init; } = [];

    public bool IsInRole(string role) =>
        Roles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
}
