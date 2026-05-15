namespace BasarsoftOdev.BLL.Options;

public class MapSettings
{
    public const string SectionName = "Map";

    /// <summary>Yakın nokta uyarısı/eşiği (metre, EPSG:3857).</summary>
    public double ProximityRadiusMeters { get; set; } = 50;

    /// <summary>Bbox sorgusunda döndürülebilecek üst sınır (10k+ senaryo).</summary>
    public int BboxMaxResults { get; set; } = 10000;

    /// <summary>Bbox olmadan liste isteğinde üst sınır.</summary>
    public int ListMaxResults { get; set; } = 5000;
}
