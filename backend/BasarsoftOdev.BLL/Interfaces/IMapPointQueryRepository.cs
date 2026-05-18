using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>MapPoint salt okunur veri erişimi (ISP).</summary>
public interface IMapPointQueryRepository
{
    Task<IReadOnlyList<MapPoint>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetAllWithinBBoxAsync(
        MapPointBBoxDto bbox, int take, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetAllLimitedAsync(
        int take, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MapPoint>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetByUserWithinBBoxAsync(
        Guid userId, MapPointBBoxDto bbox, int take, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetByUserLimitedAsync(
        Guid userId, int take, CancellationToken cancellationToken = default);
    Task<MapPoint?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MapPoint>> GetWithinMercatorRadiusAsync(
        double x, double y, double radiusMeters, CancellationToken cancellationToken = default);
}
