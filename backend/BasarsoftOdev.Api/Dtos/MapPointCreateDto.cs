using System.ComponentModel.DataAnnotations;

namespace BasarsoftOdev.Api.Dtos;

/// <summary>
/// Yeni bir nokta oluşturmak için frontend'in göndereceği payload.
/// </summary>
/// <remarks>
/// Geometri, NetTopologySuite Point yerine basit <c>lon/lat</c> alanları olarak
/// alınır — frontend tarafında JSON serialization ve OpenLayers etkileşimi
/// (haritaya tıklama vb.) bu şekilde çok daha doğal.
/// </remarks>
public class MapPointCreateDto
{
    /// <summary>İsim. Boş geçilemez; en fazla 200 karakter.</summary>
    [Required(AllowEmptyStrings = false, ErrorMessage = "İsim zorunludur.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "İsim 1-200 karakter olmalıdır.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Opsiyonel açıklama; en fazla 2000 karakter.</summary>
    [StringLength(2000, ErrorMessage = "Açıklama en fazla 2000 karakter olabilir.")]
    public string? Description { get; set; }

    /// <summary>Boylam (EPSG:4326). Geçerli aralık: -180..180.</summary>
    [Range(-180.0, 180.0, ErrorMessage = "Boylam -180 ile 180 arasında olmalıdır.")]
    public double Longitude { get; set; }

    /// <summary>Enlem (EPSG:4326). Geçerli aralık: -90..90.</summary>
    [Range(-90.0, 90.0, ErrorMessage = "Enlem -90 ile 90 arasında olmalıdır.")]
    public double Latitude { get; set; }
}
