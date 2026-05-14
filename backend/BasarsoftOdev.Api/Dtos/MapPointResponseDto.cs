namespace BasarsoftOdev.Api.Dtos;

/// <summary>
/// API'nin DIŞARI verdiği nokta gösterimi. Entity'den (DB tarafı) bilinçli
/// olarak ayrılmıştır; bu sayede DB şeması API kontratını kırmadan değişebilir.
/// </summary>
public class MapPointResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Boylam (EPSG:4326).</summary>
    public double Longitude { get; set; }

    /// <summary>Enlem (EPSG:4326).</summary>
    public double Latitude { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
