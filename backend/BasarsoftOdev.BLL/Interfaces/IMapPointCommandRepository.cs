using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>MapPoint yazma işlemleri (ISP).</summary>
public interface IMapPointCommandRepository
{
    Task AddAsync(MapPoint entity, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<MapPoint> entities, CancellationToken cancellationToken = default);
    Task UpdateAsync(MapPoint entity, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteAsync(Guid id, Guid deletedByUserId, CancellationToken cancellationToken = default);
}
