using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>MapPoint okuma/yazma yetkisi — rol başına implementasyon (OCP).</summary>
public interface IMapPointAccessPolicy
{
    void EnsureCanRead(MapPoint entity, MapPointAccessContext context);
    void EnsureCanModify(MapPoint entity, MapPointAccessContext context);
    bool IncludeCreatorInfo { get; }
}
