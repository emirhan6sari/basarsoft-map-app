using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>Rol bazlı nokta listesi — yeni rol = yeni sınıf (OCP).</summary>
public interface IMapPointListQuery
{
    int Priority { get; }
    bool CanHandle(MapPointAccessContext context);
    Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> ExecuteAsync(
        MapPointAccessContext context,
        MapPointBBoxDto? bbox,
        int take,
        CancellationToken cancellationToken = default);
}
