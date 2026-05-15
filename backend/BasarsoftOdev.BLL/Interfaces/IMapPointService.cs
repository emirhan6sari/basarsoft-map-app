using BasarsoftOdev.BLL.Dtos;

namespace BasarsoftOdev.BLL.Interfaces;

public interface IMapPointService
{
    /// <summary>
    /// Admin → tüm noktalar; User → yalnızca kendi noktaları.
    /// </summary>
    Task<MapPointListResultDto> ListAsync(
        Guid? requestingUserId,
        bool isAdmin,
        MapPointBBoxDto? bbox = null,
        int? limit = null,
        CancellationToken cancellationToken = default);
    Task<MapPointResponseDto?> GetByIdAsync(Guid id, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<MapPointResponseDto> CreateAsync(MapPointCreateDto dto, Guid createdByUserId, CancellationToken cancellationToken = default);
    Task<MapPointResponseDto?> UpdateAsync(Guid id, MapPointUpdateDto dto, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken = default);

    Task<MapPointImportResultDto> ImportAsync(MapPointImportRequestDto request, Guid createdByUserId, CancellationToken cancellationToken = default);
}
