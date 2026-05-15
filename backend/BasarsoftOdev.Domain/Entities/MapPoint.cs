namespace BasarsoftOdev.Domain.Entities;

/// <summary>Harita noktası — ödev şartı alanları + kim ekledi (rol bazlı filtreleme için).</summary>
public class MapPoint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;

    /// <summary>EPSG:4326 — boylam (derece).</summary>
    public double Longitude { get; set; }

    /// <summary>EPSG:4326 — enlem (derece).</summary>
    public double Latitude { get; set; }

    /// <summary>EPSG:3857 — X (metre, Web Mercator).</summary>
    public double XMercator { get; set; }

    /// <summary>EPSG:3857 — Y (metre, Web Mercator).</summary>
    public double YMercator { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Noktayı ekleyen kullanıcı — User rolü yalnızca kendi noktalarını görür.</summary>
    public Guid? CreatedByUserId { get; set; }

    public ApplicationUser? CreatedBy { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAt { get; set; }

    public Guid? DeletedByUserId { get; set; }
}
