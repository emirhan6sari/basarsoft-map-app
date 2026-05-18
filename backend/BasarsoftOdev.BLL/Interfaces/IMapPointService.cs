using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Dtos;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IMapPointService
{
    Task<MapPointListResultDto> ListAsync(
        MapPointAccessContext access,
        MapPointBBoxDto? bbox = null,
        int? limit = null,
        CancellationToken cancellationToken = default);

    Task<MapPointResponseDto?> GetByIdAsync(
        Guid id, MapPointAccessContext access, CancellationToken cancellationToken = default);

    Task<MapPointResponseDto> CreateAsync(MapPointCreateDto dto, Guid createdByUserId, CancellationToken cancellationToken = default);

    Task<MapPointResponseDto?> UpdateAsync(
        Guid id, MapPointUpdateDto dto, MapPointAccessContext access, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, MapPointAccessContext access, CancellationToken cancellationToken = default);

    Task<MapPointImportResultDto> ImportAsync(
        MapPointImportRequestDto request, Guid createdByUserId, CancellationToken cancellationToken = default);
}
