using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Interfaces;

namespace BasarsoftOdev.BLL.Services.MapPoints;

/// <summary>JWT rollerine göre Admin veya User erişim politikası seçer.</summary>
public sealed class MapPointAccessPolicyResolver : IMapPointAccessPolicyResolver
{
    private readonly AdminMapPointAccessPolicy _admin;
    private readonly UserMapPointAccessPolicy _user;

    public MapPointAccessPolicyResolver(
        AdminMapPointAccessPolicy admin,
        UserMapPointAccessPolicy user)
    {
        _admin = admin;
        _user = user;
    }

    public IMapPointAccessPolicy Resolve(MapPointAccessContext context)
    {
        if (context.IsInRole(RoleNames.Admin))
            return _admin;
        return _user;
    }
}
