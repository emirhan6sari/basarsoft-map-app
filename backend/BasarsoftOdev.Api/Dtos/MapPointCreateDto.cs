using System.ComponentModel.DataAnnotations;
using BasarsoftOdev.Api.Entities;

namespace BasarsoftOdev.Api.Dtos;

/// <summary>
/// Yeni bir nokta oluşturmak için frontend'in göndereceği payload.
/// </summary>
public class MapPointCreateDto
{
    /// <summary>İsim. Boş geçilemez; en fazla 200 karakter.</summary>
    [Required(AllowEmptyStrings = false, ErrorMessage = "İsim zorunludur.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "İsim 1-200 karakter olmalıdır.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Numara / Kod. Boş geçilemez; en fazla 50 karakter.</summary>
    [Required(AllowEmptyStrings = false, ErrorMessage = "Numara zorunludur.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Numara 1-50 karakter olmalıdır.")]
    public string Number { get; set; } = string.Empty;

    /// <summary>Opsiyonel açıklama; en fazla 2000 karakter.</summary>
    [StringLength(2000, ErrorMessage = "Açıklama en fazla 2000 karakter olabilir.")]
    public string? Description { get; set; }

    /// <summary>İş kategorisi. EnumDataType ile DataAnnotation otomatik validasyon yapar.</summary>
    [Required(ErrorMessage = "Kategori zorunludur.")]
    [EnumDataType(typeof(MapPointCategory), ErrorMessage = "Geçersiz kategori.")]
    public MapPointCategory Category { get; set; }

    /// <summary>Boylam (EPSG:4326). Geçerli aralık: -180..180.</summary>
    [Range(-180.0, 180.0, ErrorMessage = "Boylam -180 ile 180 arasında olmalıdır.")]
    public double Longitude { get; set; }

    /// <summary>Enlem (EPSG:4326). Geçerli aralık: -90..90.</summary>
    [Range(-90.0, 90.0, ErrorMessage = "Enlem -90 ile 90 arasında olmalıdır.")]
    public double Latitude { get; set; }
}
