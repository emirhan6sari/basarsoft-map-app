using BasarsoftOdev.Api.Data;
using BasarsoftOdev.Api.Dtos;
using BasarsoftOdev.Api.Entities;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace BasarsoftOdev.Api.Services;

/// <summary>
/// <see cref="IMapPointService"/>'in EF Core implementasyonu.
/// </summary>
public class MapPointService : IMapPointService
{
    private readonly AppDbContext _db;

    /// <summary>
    /// EPSG:4326 için tek (statik) <see cref="GeometryFactory"/>.
    /// Her seferinde yenisini üretmek hem alloc israfı hem de SRID karışıklığı
    /// riski oluşturur — bu yüzden static.
    /// </summary>
    private static readonly GeometryFactory GeometryFactoryWgs84 =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    public MapPointService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<MapPointResponseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // En son eklenen en üstte (UI listeleme için makul varsayılan).
        var entities = await _db.MapPoints
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(ToResponseDto).ToList();
    }

    public async Task<MapPointResponseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.MapPoints
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        return entity is null ? null : ToResponseDto(entity);
    }

    public async Task<MapPointResponseDto> CreateAsync(MapPointCreateDto dto, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var entity = new MapPoint
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Number = dto.Number.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Category = dto.Category,
            Location = CreatePoint(dto.Longitude, dto.Latitude),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.MapPoints.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return ToResponseDto(entity);
    }

    public async Task<MapPointResponseDto?> UpdateAsync(Guid id, MapPointUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _db.MapPoints.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.Name = dto.Name.Trim();
        entity.Number = dto.Number.Trim();
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.Category = dto.Category;
        entity.Location = CreatePoint(dto.Longitude, dto.Latitude);
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return ToResponseDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _db.MapPoints.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        _db.MapPoints.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    // ----------------------------------------------------------------------
    // Yardımcılar
    // ----------------------------------------------------------------------

    /// <summary>
    /// Lon/Lat değerlerinden EPSG:4326 SRID'li <see cref="Point"/> üretir.
    /// NTS konvansiyonu: <c>X = longitude</c>, <c>Y = latitude</c>.
    /// </summary>
    private static Point CreatePoint(double longitude, double latitude)
        => GeometryFactoryWgs84.CreatePoint(new Coordinate(longitude, latitude));

    private static MapPointResponseDto ToResponseDto(MapPoint entity)
    {
        var (xMercator, yMercator) = LonLatToMercator(entity.Location.X, entity.Location.Y);
        return new MapPointResponseDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Number = entity.Number,
            Description = entity.Description,
            Category = entity.Category,
            Longitude = entity.Location.X,
            Latitude = entity.Location.Y,
            XMercator = xMercator,
            YMercator = yMercator,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
        };
    }

    // ----------------------------------------------------------------------
    // EPSG:4326 → EPSG:3857 (Spherical / Web Mercator) dönüşümü
    // ----------------------------------------------------------------------
    // Formül her yerde bulunabilir (OpenLayers, proj4, Wikipedia "Web Mercator").
    // Backend tarafında ek bağımlılığa girmemek için kendimiz hesaplıyoruz.
    // Yer küresi yarıçapı (Sphere): 6 378 137 m — standart.
    private const double EarthRadiusMeters = 6378137.0;

    private static (double X, double Y) LonLatToMercator(double lon, double lat)
    {
        var x = lon * Math.PI / 180.0 * EarthRadiusMeters;

        // Mercator y, kutup yakınında sonsuza gider; lat'i ±85.05113° sınırla.
        var latClamped = Math.Max(-85.05112878, Math.Min(85.05112878, lat));
        var y = Math.Log(Math.Tan((90.0 + latClamped) * Math.PI / 360.0)) * EarthRadiusMeters;

        return (x, y);
    }
}
