using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BasarsoftOdev.BLL.Services;

public class MapPointService : IMapPointService
{
    private readonly IMapPointRepository _repository;
    private readonly ICoordinateTransformationService _coordinates;
    private readonly ILogger<MapPointService> _logger;
    private readonly double _proximityRadiusMeters;

    public MapPointService(
        IMapPointRepository repository,
        ICoordinateTransformationService coordinates,
        ILogger<MapPointService> logger,
        IOptions<MapSettings> mapSettings)
    {
        _repository = repository;
        _coordinates = coordinates;
        _logger = logger;
        _proximityRadiusMeters = mapSettings.Value.ProximityRadiusMeters;
    }

    public async Task<IReadOnlyList<MapPointResponseDto>> GetAllAsync(Guid? requestingUserId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<MapPoint> entities;
        if (isAdmin)
            entities = await _repository.GetAllAsync(cancellationToken);
        else if (requestingUserId.HasValue)
            entities = await _repository.GetByUserAsync(requestingUserId.Value, cancellationToken);
        else
            entities = [];

        return entities.Select(e => ToDto(e, isAdmin)).ToList();
    }

    public async Task<MapPointResponseDto?> GetByIdAsync(Guid id, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;
        EnsureCanAccess(entity, requestingUserId, isAdmin);
        return ToDto(entity, isAdmin);
    }

    public async Task<MapPointResponseDto> CreateAsync(MapPointCreateDto dto, Guid createdByUserId, CancellationToken cancellationToken = default)
    {
        var coords = _coordinates.Resolve(dto.Longitude, dto.Latitude, dto.XMercator, dto.YMercator);
        await EnsureNotTooCloseAsync(coords.XMercator, coords.YMercator, excludeId: null, cancellationToken);

        var entity = new MapPoint
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Number = dto.Number.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Category = dto.Category.Trim(),
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = createdByUserId,
        };
        ApplyCoordinates(entity, coords);

        await _repository.AddAsync(entity, cancellationToken);
        _logger.LogInformation("MapPoint oluşturuldu: {Id} ({Name}) by user {UserId}", entity.Id, entity.Name, createdByUserId);
        return ToDto(entity, includeCreatorInfo: false);
    }

    public async Task<MapPointResponseDto?> UpdateAsync(Guid id, MapPointUpdateDto dto, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        EnsureCanModify(entity, requestingUserId, isAdmin);

        var coords = _coordinates.Resolve(dto.Longitude, dto.Latitude, dto.XMercator, dto.YMercator);
        await EnsureNotTooCloseAsync(coords.XMercator, coords.YMercator, excludeId: id, cancellationToken);

        entity.Name = dto.Name.Trim();
        entity.Number = dto.Number.Trim();
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.Category = dto.Category.Trim();
        ApplyCoordinates(entity, coords);

        await _repository.UpdateAsync(entity, cancellationToken);
        _logger.LogInformation("MapPoint güncellendi: {Id}", id);
        return ToDto(entity, isAdmin);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        EnsureCanModify(entity, requestingUserId, isAdmin);
        await _repository.SoftDeleteAsync(id, requestingUserId, cancellationToken);
        _logger.LogInformation("MapPoint soft-delete: {Id} by {UserId}", id, requestingUserId);
        return true;
    }

    private static void EnsureCanAccess(MapPoint entity, Guid userId, bool isAdmin)
    {
        if (isAdmin) return;
        if (entity.CreatedByUserId != userId)
            throw new ForbiddenBusinessException("Bu noktayı görüntüleme yetkiniz yok.");
    }

    private static void EnsureCanModify(MapPoint entity, Guid userId, bool isAdmin)
    {
        if (isAdmin) return;
        if (entity.CreatedByUserId != userId)
            throw new ForbiddenBusinessException("Bu noktayı değiştirme yetkiniz yok.");
    }

    private async Task EnsureNotTooCloseAsync(double x, double y, Guid? excludeId, CancellationToken cancellationToken)
    {
        var nearby = await _repository.GetWithinMercatorRadiusAsync(x, y, _proximityRadiusMeters, cancellationToken);
        var conflict = nearby.FirstOrDefault(p => excludeId is null || p.Id != excludeId.Value);
        if (conflict is not null)
        {
            throw new BusinessException(
                Common.ErrorCodes.Proximity,
                $"Bu konuma çok yakın (≤{_proximityRadiusMeters} m) başka bir nokta var: \"{conflict.Name}\".",
                statusCode: 409);
        }
    }

    private static void ApplyCoordinates(MapPoint entity, Domain.ValueObjects.GeoCoordinateSet coords)
    {
        entity.Longitude = coords.Longitude;
        entity.Latitude = coords.Latitude;
        entity.XMercator = coords.XMercator;
        entity.YMercator = coords.YMercator;
    }

    private static MapPointResponseDto ToDto(MapPoint e, bool includeCreatorInfo) => new()
    {
        Id = e.Id,
        Name = e.Name,
        Number = e.Number,
        Description = e.Description,
        Category = e.Category,
        Longitude = e.Longitude,
        Latitude = e.Latitude,
        XMercator = e.XMercator,
        YMercator = e.YMercator,
        CreatedByUserId = e.CreatedByUserId,
        CreatedByUserName = includeCreatorInfo ? e.CreatedBy?.UserName : null,
        CreatedByDisplayName = includeCreatorInfo ? e.CreatedBy?.DisplayName : null,
        CreatedAt = e.CreatedAt,
    };
}
