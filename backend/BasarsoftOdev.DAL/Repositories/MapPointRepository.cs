using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.DAL.Data;
using BasarsoftOdev.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BasarsoftOdev.DAL.Repositories;

public class MapPointRepository : IMapPointRepository
{
    private readonly AppDbContext _db;

    public MapPointRepository(AppDbContext db) => _db = db;

    private IQueryable<MapPoint> WithCreator()
        => _db.MapPoints.Include(p => p.CreatedBy);

    public async Task<IReadOnlyList<MapPoint>> GetAllAsync(CancellationToken cancellationToken = default)
        => await WithCreator().AsNoTracking().OrderByDescending(p => p.CreatedAt).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<MapPoint>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => await WithCreator().AsNoTracking()
            .Where(p => p.CreatedByUserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<MapPoint?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await WithCreator().FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task<IReadOnlyList<MapPoint>> GetWithinMercatorRadiusAsync(
        double x, double y, double radiusMeters, CancellationToken cancellationToken = default)
    {
        var radiusSquared = radiusMeters * radiusMeters;
        return await _db.MapPoints
            .AsNoTracking()
            .Where(p =>
                (p.XMercator - x) * (p.XMercator - x) +
                (p.YMercator - y) * (p.YMercator - y) <= radiusSquared)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(MapPoint entity, CancellationToken cancellationToken = default)
    {
        _db.MapPoints.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(MapPoint entity, CancellationToken cancellationToken = default)
    {
        _db.MapPoints.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid deletedByUserId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.MapPoints.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (entity is null || entity.IsDeleted) return false;

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.DeletedByUserId = deletedByUserId;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
