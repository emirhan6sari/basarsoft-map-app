using BasarsoftOdev.Api.Entities;

namespace BasarsoftOdev.Api.Dtos;

/// <summary>
/// API'nin DIŞARI verdiği nokta gösterimi.
/// </summary>
/// <remarks>
/// Ödev şartı (madde "Add Point"): kaydedilen veri içerisinde EPSG:4326 ve
/// EPSG:3857 koordinatları birlikte bulunmalıdır. Bu yüzden response'ta her
/// iki projeksiyon da yer alıyor; frontend istemci tarafında ekstra dönüşüm
/// yapmasın diye.
/// </remarks>
public class MapPointResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>İş kategorisi.</summary>
    public MapPointCategory Category { get; set; }

    /// <summary>Boylam (EPSG:4326).</summary>
    public double Longitude { get; set; }

    /// <summary>Enlem (EPSG:4326).</summary>
    public double Latitude { get; set; }

    /// <summary>X (EPSG:3857 / Web Mercator, metre).</summary>
    public double XMercator { get; set; }

    /// <summary>Y (EPSG:3857 / Web Mercator, metre).</summary>
    public double YMercator { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
