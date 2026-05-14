using BasarsoftOdev.Api.Dtos;

namespace BasarsoftOdev.Api.Services;

/// <summary>
/// MapPoint için iş kuralları ve veritabanı işlemleri katmanı.
/// Controller, EF Core'a direkt değil bu interface üzerinden konuşur — bu
/// sayede ilerideki testler / mocking ve refactor'lar kolaylaşır.
/// </summary>
public interface IMapPointService
{
    /// <summary>Tüm noktaları listeler (yeni oluşturulan en üstte).</summary>
    Task<IReadOnlyList<MapPointResponseDto>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Tek nokta. Bulunamazsa <c>null</c>.</summary>
    Task<MapPointResponseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Yeni nokta oluşturur ve oluşturulan kaydı döner.</summary>
    Task<MapPointResponseDto> CreateAsync(MapPointCreateDto dto, CancellationToken cancellationToken = default);

    /// <summary>Mevcut noktayı tamamen günceller. Yoksa <c>null</c>.</summary>
    Task<MapPointResponseDto?> UpdateAsync(Guid id, MapPointUpdateDto dto, CancellationToken cancellationToken = default);

    /// <summary>Noktayı siler. Yoksa <c>false</c>, silindiyse <c>true</c>.</summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
