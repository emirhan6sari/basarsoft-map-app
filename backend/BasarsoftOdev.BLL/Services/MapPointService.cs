using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Options;
using BasarsoftOdev.BLL.Services.GeoImport;
using BasarsoftOdev.Domain.Entities;
using BasarsoftOdev.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BasarsoftOdev.BLL.Services;

public class MapPointService : IMapPointService
{
    private readonly IMapPointRepository _repository;
    private readonly ICoordinateTransformationService _coordinates;
    private readonly IGeoGeometryParser _geoParser;
    private readonly ILogger<MapPointService> _logger;
    private readonly double _proximityRadiusMeters;
    private readonly int _bboxMaxResults;
    private readonly int _listMaxResults;

    public MapPointService(
        IMapPointRepository repository,
        ICoordinateTransformationService coordinates,
        IGeoGeometryParser geoParser,
        ILogger<MapPointService> logger,
        IOptions<MapSettings> mapSettings)
    {
        _repository = repository;
        _coordinates = coordinates;
        _geoParser = geoParser;
        _logger = logger;
        _proximityRadiusMeters = mapSettings.Value.ProximityRadiusMeters;
        _bboxMaxResults = mapSettings.Value.BboxMaxResults;
        _listMaxResults = mapSettings.Value.ListMaxResults;
    }

    public async Task<MapPointListResultDto> ListAsync(
        Guid? requestingUserId,
        bool isAdmin,
        MapPointBBoxDto? bbox = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var cap = bbox is null ? _listMaxResults : _bboxMaxResults;
        var take = Math.Clamp(limit ?? cap, 1, cap);

        IReadOnlyList<MapPoint> entities;
        int totalCount;

        if (isAdmin)
        {
            (entities, totalCount) = bbox is null
                ? await _repository.GetAllLimitedAsync(take, cancellationToken)
                : await _repository.GetAllWithinBBoxAsync(bbox, take, cancellationToken);
        }
        else if (requestingUserId.HasValue)
        {
            (entities, totalCount) = bbox is null
                ? await _repository.GetByUserLimitedAsync(requestingUserId.Value, take, cancellationToken)
                : await _repository.GetByUserWithinBBoxAsync(requestingUserId.Value, bbox, take, cancellationToken);
        }
        else
        {
            entities = [];
            totalCount = 0;
        }

        var items = entities.Select(e => ToDto(e, includeCreatorInfo: isAdmin && bbox is null)).ToList();
        var returned = items.Count;

        if (totalCount > returned)
        {
            _logger.LogInformation(
                "MapPoint listesi kısaltıldı: {Returned}/{Total} (limit={Take}, bbox={HasBbox})",
                returned,
                totalCount,
                take,
                bbox is not null);
        }

        return new MapPointListResultDto
        {
            Items = items,
            TotalCount = totalCount,
            ReturnedCount = returned,
            Truncated = totalCount > returned,
            MaxResults = cap,
        };
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

    public async Task<MapPointImportResultDto> ImportAsync(
        MapPointImportRequestDto request,
        Guid createdByUserId,
        CancellationToken cancellationToken = default)
    {
        var candidates = _geoParser.Parse(request.Format, request.Content);
        var created = new List<MapPoint>();
        var createdDtos = new List<MapPointResponseDto>();
        var skipped = new List<MapPointImportSkipDto>();
        var acceptedMercator = new List<(double X, double Y)>();

        for (var i = 0; i < candidates.Count; i++)
        {
            var candidate = candidates[i];
            var index = i + 1;

            GeoCoordinateSet coords;
            try
            {
                coords = ResolveCandidateCoordinates(candidate);
            }
            catch (BusinessException ex)
            {
                skipped.Add(new MapPointImportSkipDto
                {
                    Index = index,
                    Longitude = candidate.Longitude,
                    Latitude = candidate.Latitude,
                    Reason = ex.Message,
                });
                continue;
            }

            if (IsTooCloseToBatch(coords.XMercator, coords.YMercator, acceptedMercator))
            {
                skipped.Add(new MapPointImportSkipDto
                {
                    Index = index,
                    Longitude = coords.Longitude,
                    Latitude = coords.Latitude,
                    Reason = $"İçe aktarım paketinde başka bir noktaya çok yakın (≤{_proximityRadiusMeters} m).",
                });
                continue;
            }

            try
            {
                await EnsureNotTooCloseAsync(coords.XMercator, coords.YMercator, excludeId: null, cancellationToken);
            }
            catch (BusinessException ex)
            {
                skipped.Add(new MapPointImportSkipDto
                {
                    Index = index,
                    Longitude = coords.Longitude,
                    Latitude = coords.Latitude,
                    Reason = ex.Message,
                });
                continue;
            }

            var entity = new MapPoint
            {
                Id = Guid.NewGuid(),
                Name = BuildImportName(candidate, request.NamePrefix, index),
                Number = BuildImportNumber(candidate, request.NumberPrefix, index),
                Description = string.IsNullOrWhiteSpace(candidate.Description)
                    ? (string.IsNullOrWhiteSpace(request.DefaultDescription) ? null : request.DefaultDescription.Trim())
                    : candidate.Description.Trim(),
                Category = string.IsNullOrWhiteSpace(candidate.Category)
                    ? request.Category.Trim()
                    : candidate.Category.Trim(),
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = createdByUserId,
            };
            ApplyCoordinates(entity, coords);

            created.Add(entity);
            createdDtos.Add(ToDto(entity, includeCreatorInfo: false));
            acceptedMercator.Add((coords.XMercator, coords.YMercator));
        }

        if (created.Count > 0)
            await _repository.AddRangeAsync(created, cancellationToken);

        _logger.LogInformation(
            "MapPoint içe aktarım: {Created} kayıt, {Skipped} atlandı — user {UserId}",
            created.Count,
            skipped.Count,
            createdByUserId);

        return new MapPointImportResultDto
        {
            CreatedCount = created.Count,
            SkippedCount = skipped.Count,
            Created = createdDtos,
            Skipped = skipped,
        };
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

    private GeoCoordinateSet ResolveCandidateCoordinates(GeoImportCandidate candidate)
    {
        var lon = candidate.Longitude;
        var lat = candidate.Latitude;
        if (LooksLikeWebMercator(lon, lat))
            return _coordinates.FromWebMercator(lon, lat);
        return _coordinates.FromWgs84(lon, lat);
    }

    private static bool LooksLikeWebMercator(double x, double y)
        => Math.Abs(x) > 180 || Math.Abs(y) > 90;

    private bool IsTooCloseToBatch(double x, double y, IReadOnlyList<(double X, double Y)> batch)
    {
        var radiusSquared = _proximityRadiusMeters * _proximityRadiusMeters;
        return batch.Any(p =>
            (p.X - x) * (p.X - x) + (p.Y - y) * (p.Y - y) <= radiusSquared);
    }

    private static string BuildImportName(GeoImportCandidate candidate, string prefix, int index)
        => string.IsNullOrWhiteSpace(candidate.Name) ? $"{prefix.Trim()} {index}" : candidate.Name.Trim();

    private static string BuildImportNumber(GeoImportCandidate candidate, string prefix, int index)
        => string.IsNullOrWhiteSpace(candidate.Number) ? $"{prefix.Trim()}-{index:D4}" : candidate.Number.Trim();

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
