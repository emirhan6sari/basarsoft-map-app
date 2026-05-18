using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Services.MapPoints;

/// <summary>Tüm noktalara okuma/yazma; yanıtta oluşturan bilgisi gösterilir.</summary>
public sealed class AdminMapPointAccessPolicy : IMapPointAccessPolicy
{
    public bool IncludeCreatorInfo => true;

    public void EnsureCanRead(MapPoint entity, MapPointAccessContext context) { }

    public void EnsureCanModify(MapPoint entity, MapPointAccessContext context) { }
}
