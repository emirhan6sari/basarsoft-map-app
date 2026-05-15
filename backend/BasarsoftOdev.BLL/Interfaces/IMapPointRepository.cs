using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IMapPointRepository
{
    Task<IReadOnlyList<MapPoint>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MapPoint>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<MapPoint?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MapPoint>> GetWithinMercatorRadiusAsync(double x, double y, double radiusMeters, CancellationToken cancellationToken = default);
    Task AddAsync(MapPoint entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(MapPoint entity, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteAsync(Guid id, Guid deletedByUserId, CancellationToken cancellationToken = default);
}
