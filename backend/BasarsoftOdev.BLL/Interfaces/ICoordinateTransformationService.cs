using BasarsoftOdev.Domain.ValueObjects;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>
/// EPSG:4326 ↔ EPSG:3857 dönüşümlerini merkezi yönetir.
/// </summary>
public interface ICoordinateTransformationService
{
    GeoCoordinateSet FromWgs84(double longitude, double latitude);
    GeoCoordinateSet FromWebMercator(double xMercator, double yMercator);

    /// <summary>
    /// Gelen koordinatlardan eksik olanı hesaplar; her iki format da dolu döner.
    /// </summary>
    GeoCoordinateSet Resolve(double? longitude, double? latitude, double? xMercator, double? yMercator);
}
