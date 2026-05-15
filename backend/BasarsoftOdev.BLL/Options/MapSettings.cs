namespace BasarsoftOdev.BLL.Options;

public class MapSettings
{
    public const string SectionName = "Map";

    /// <summary>Yakın nokta uyarısı/eşiği (metre, EPSG:3857).</summary>
    public double ProximityRadiusMeters { get; set; } = 50;
}
