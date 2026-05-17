using BasarsoftOdev.BLL.Dtos;
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

    public async Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetAllWithinBBoxAsync(
        MapPointBBoxDto bbox,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = ApplyBBox(WithCreator().AsNoTracking(), bbox);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    public async Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetAllLimitedAsync(
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = WithCreator().AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    public async Task<IReadOnlyList<MapPoint>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => await WithCreator().AsNoTracking()
            .Where(p => p.CreatedByUserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetByUserWithinBBoxAsync(
        Guid userId,
        MapPointBBoxDto bbox,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = ApplyBBox(
            _db.MapPoints.AsNoTracking().Where(p => p.CreatedByUserId == userId),
            bbox);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    public async Task<(IReadOnlyList<MapPoint> Items, int TotalCount)> GetByUserLimitedAsync(
        Guid userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = _db.MapPoints.AsNoTracking().Where(p => p.CreatedByUserId == userId);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    private static IQueryable<MapPoint> ApplyBBox(IQueryable<MapPoint> query, MapPointBBoxDto bbox)
        => query.Where(p =>
            p.Longitude >= bbox.MinLongitude
            && p.Longitude <= bbox.MaxLongitude
            && p.Latitude >= bbox.MinLatitude
            && p.Latitude <= bbox.MaxLatitude);

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

    public async Task AddRangeAsync(IEnumerable<MapPoint> entities, CancellationToken cancellationToken = default)
    {
        _db.MapPoints.AddRange(entities);
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
