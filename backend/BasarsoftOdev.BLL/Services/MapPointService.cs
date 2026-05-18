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

/// <summary>
/// Harita noktası iş kuralları: liste yetkisi, koordinat çözümleme, yakınlık kontrolü ve GeoJSON/WKT içe aktarım.
/// </summary>
public class MapPointService : IMapPointService
{
    private readonly IMapPointQueryRepository _queries;
    private readonly IMapPointCommandRepository _commands;
    private readonly ICoordinateTransformationService _coordinates;
    private readonly IGeoGeometryParser _geoParser;
    private readonly IMapPointAccessPolicyResolver _accessPolicyResolver;
    private readonly IMapPointListQuerySelector _listQuerySelector;
    private readonly ILogger<MapPointService> _logger;
    private readonly IAppLogWriter _appLogWriter;
    private readonly double _proximityRadiusMeters;
    private readonly int _bboxMaxResults;
    private readonly int _listMaxResults;

    public MapPointService(
        IMapPointQueryRepository queries,
        IMapPointCommandRepository commands,
        ICoordinateTransformationService coordinates,
        IGeoGeometryParser geoParser,
        IMapPointAccessPolicyResolver accessPolicyResolver,
        IMapPointListQuerySelector listQuerySelector,
        ILogger<MapPointService> logger,
        IAppLogWriter appLogWriter,
        IOptions<MapSettings> mapSettings)
    {
        _queries = queries;
        _commands = commands;
        _coordinates = coordinates;
        _geoParser = geoParser;
        _accessPolicyResolver = accessPolicyResolver;
        _listQuerySelector = listQuerySelector;
        _logger = logger;
        _appLogWriter = appLogWriter;
        _proximityRadiusMeters = mapSettings.Value.ProximityRadiusMeters;
        _bboxMaxResults = mapSettings.Value.BboxMaxResults;
        _listMaxResults = mapSettings.Value.ListMaxResults;
    }

    public async Task<MapPointListResultDto> ListAsync(
        MapPointAccessContext access,
        MapPointBBoxDto? bbox = null,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var policy = _accessPolicyResolver.Resolve(access);
        var cap = bbox is null ? _listMaxResults : _bboxMaxResults;
        var take = Math.Clamp(limit ?? cap, 1, cap);

        var listQuery = _listQuerySelector.Select(access);
        var (entities, totalCount) = await listQuery.ExecuteAsync(access, bbox, take, cancellationToken);

        var items = entities.Select(e => ToDto(e, policy.IncludeCreatorInfo)).ToList();
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

    public async Task<MapPointResponseDto?> GetByIdAsync(
        Guid id, MapPointAccessContext access, CancellationToken cancellationToken = default)
    {
        var entity = await _queries.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var policy = _accessPolicyResolver.Resolve(access);
        policy.EnsureCanRead(entity, access);
        return ToDto(entity, policy.IncludeCreatorInfo);
    }

    public async Task<MapPointResponseDto> CreateAsync(MapPointCreateDto dto, Guid createdByUserId, CancellationToken cancellationToken = default)
    {
        var coords = _coordinates.Resolve(dto.Longitude, dto.Latitude, dto.XMercator, dto.YMercator);
        if (!dto.ConfirmProximityWarning)
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

        await _commands.AddAsync(entity, cancellationToken);
        _logger.LogInformation("MapPoint oluşturuldu: {Id} ({Name}) by user {UserId}", entity.Id, entity.Name, createdByUserId);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"MapPoint oluşturuldu: {entity.Id} ({entity.Name})",
            SourceContext: nameof(MapPointService),
            UserId: createdByUserId.ToString(),
            Properties: new Dictionary<string, object?>
            {
                ["Id"] = entity.Id,
                ["Name"] = entity.Name,
                ["Category"] = entity.Category,
            }),
            cancellationToken);
        var created = await _queries.GetByIdAsync(entity.Id, cancellationToken);
        return ToDto(created ?? entity, includeCreatorInfo: true);
    }

    public async Task<MapPointResponseDto?> UpdateAsync(
        Guid id, MapPointUpdateDto dto, MapPointAccessContext access, CancellationToken cancellationToken = default)
    {
        var entity = await _queries.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        var policy = _accessPolicyResolver.Resolve(access);
        policy.EnsureCanModify(entity, access);

        var coords = _coordinates.Resolve(dto.Longitude, dto.Latitude, dto.XMercator, dto.YMercator);
        if (!dto.ConfirmProximityWarning)
            await EnsureNotTooCloseAsync(coords.XMercator, coords.YMercator, excludeId: id, cancellationToken);

        entity.Name = dto.Name.Trim();
        entity.Number = dto.Number.Trim();
        entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        entity.Category = dto.Category.Trim();
        ApplyCoordinates(entity, coords);

        await _commands.UpdateAsync(entity, cancellationToken);
        _logger.LogInformation("MapPoint güncellendi: {Id}", id);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"MapPoint güncellendi: {id}",
            SourceContext: nameof(MapPointService),
            UserId: access.UserId.ToString(),
            Properties: new Dictionary<string, object?> { ["Id"] = id }),
            cancellationToken);
        return ToDto(entity, policy.IncludeCreatorInfo);
    }

    /// <summary>
    /// Her aday ayrı değerlendirilir; hatalı veya çok yakın olanlar atlanır, geçenler toplu kaydedilir.
    /// </summary>
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
            await _commands.AddRangeAsync(created, cancellationToken);

        _logger.LogInformation(
            "MapPoint içe aktarım: {Created} kayıt, {Skipped} atlandı — user {UserId}",
            created.Count,
            skipped.Count,
            createdByUserId);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"MapPoint içe aktarım: {created.Count} kayıt, {skipped.Count} atlandı",
            SourceContext: nameof(MapPointService),
            UserId: createdByUserId.ToString(),
            Properties: new Dictionary<string, object?>
            {
                ["CreatedCount"] = created.Count,
                ["SkippedCount"] = skipped.Count,
            }),
            cancellationToken);

        return new MapPointImportResultDto
        {
            CreatedCount = created.Count,
            SkippedCount = skipped.Count,
            Created = createdDtos,
            Skipped = skipped,
        };
    }

    public async Task<bool> DeleteAsync(Guid id, MapPointAccessContext access, CancellationToken cancellationToken = default)
    {
        var entity = await _queries.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        var policy = _accessPolicyResolver.Resolve(access);
        policy.EnsureCanModify(entity, access);
        await _commands.SoftDeleteAsync(id, access.UserId, cancellationToken);
        _logger.LogInformation("MapPoint soft-delete: {Id} by {UserId}", id, access.UserId);
        await _appLogWriter.WriteAsync(new AppLogEntry(
            "Information",
            $"MapPoint silindi (soft-delete): {id}",
            SourceContext: nameof(MapPointService),
            UserId: access.UserId.ToString(),
            Properties: new Dictionary<string, object?> { ["Id"] = id }),
            cancellationToken);
        return true;
    }

    /// <summary>EPSG:3857 düzleminde kare mesafe — yakınlık eşiği appsettings Map:ProximityRadiusMeters.</summary>
    private async Task EnsureNotTooCloseAsync(double x, double y, Guid? excludeId, CancellationToken cancellationToken)
    {
        var nearby = await _queries.GetWithinMercatorRadiusAsync(x, y, _proximityRadiusMeters, cancellationToken);
        var conflict = nearby.FirstOrDefault(p => excludeId is null || p.Id != excludeId.Value);
        if (conflict is not null)
        {
            throw new BusinessException(
                Common.ErrorCodes.Proximity,
                $"Bu konuma çok yakın (≤{_proximityRadiusMeters} m) başka bir nokta var: \"{conflict.Name}\".",
                statusCode: 409);
        }
    }

    private static void ApplyCoordinates(MapPoint entity, GeoCoordinateSet coords)
    {
        entity.Longitude = coords.Longitude;
        entity.Latitude = coords.Latitude;
        entity.XMercator = coords.XMercator;
        entity.YMercator = coords.YMercator;
    }

    /// <summary>GeoJSON bazen 3857 değerlerini lon/lat alanına yazar; büyüklükten ayırt edilir.</summary>
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
