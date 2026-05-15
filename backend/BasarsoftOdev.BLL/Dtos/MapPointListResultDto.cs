namespace BasarsoftOdev.BLL.Dtos;

/// <summary>Harita listeleme — bbox + performans meta verisi.</summary>
public class MapPointListResultDto
{
    public IReadOnlyList<MapPointResponseDto> Items { get; set; } = [];

    /// <summary>Filtre kapsamındaki toplam kayıt (bbox veya tüm liste).</summary>
    public int TotalCount { get; set; }

    public int ReturnedCount { get; set; }

    public bool Truncated { get; set; }

    public int MaxResults { get; set; }
}
