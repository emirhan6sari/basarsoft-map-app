namespace BasarsoftOdev.BLL.Dtos;

/// <summary>EPSG:4326 — harita görünür alanı (bbox) filtresi.</summary>
public class MapPointBBoxDto
{
    public double MinLongitude { get; set; }
    public double MinLatitude { get; set; }
    public double MaxLongitude { get; set; }
    public double MaxLatitude { get; set; }
}
