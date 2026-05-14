using System.ComponentModel.DataAnnotations;
using BasarsoftOdev.Api.Entities;

namespace BasarsoftOdev.Api.Dtos;

/// <summary>
/// Mevcut bir noktayı güncellemek için frontend'in göndereceği payload.
/// </summary>
public class MapPointUpdateDto
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "İsim zorunludur.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "İsim 1-200 karakter olmalıdır.")]
    public string Name { get; set; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Numara zorunludur.")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "Numara 1-50 karakter olmalıdır.")]
    public string Number { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "Açıklama en fazla 2000 karakter olabilir.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Kategori zorunludur.")]
    [EnumDataType(typeof(MapPointCategory), ErrorMessage = "Geçersiz kategori.")]
    public MapPointCategory Category { get; set; }

    [Range(-180.0, 180.0, ErrorMessage = "Boylam -180 ile 180 arasında olmalıdır.")]
    public double Longitude { get; set; }

    [Range(-90.0, 90.0, ErrorMessage = "Enlem -90 ile 90 arasında olmalıdır.")]
    public double Latitude { get; set; }
}
