using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.Domain.ValueObjects;

namespace BasarsoftOdev.BLL.Services;

public class CoordinateTransformationService : ICoordinateTransformationService
{
    private const double EarthRadiusMeters = 6378137.0;

    public GeoCoordinateSet FromWgs84(double longitude, double latitude)
    {
        ValidateWgs84(longitude, latitude);
        var (x, y) = LonLatToMercator(longitude, latitude);
        return new GeoCoordinateSet(longitude, latitude, x, y);
    }

    public GeoCoordinateSet FromWebMercator(double xMercator, double yMercator)
    {
        var (lon, lat) = MercatorToLonLat(xMercator, yMercator);
        ValidateWgs84(lon, lat);
        return new GeoCoordinateSet(lon, lat, xMercator, yMercator);
    }

    private const double MercatorToleranceMeters = 0.5;

    public GeoCoordinateSet Resolve(double? longitude, double? latitude, double? xMercator, double? yMercator)
    {
        var has4326 = longitude.HasValue && latitude.HasValue;
        var has3857 = xMercator.HasValue && yMercator.HasValue;

        if (has4326 && has3857)
        {
            var from4326 = FromWgs84(longitude!.Value, latitude!.Value);
            var dx = from4326.XMercator - xMercator!.Value;
            var dy = from4326.YMercator - yMercator!.Value;
            if (dx * dx + dy * dy > MercatorToleranceMeters * MercatorToleranceMeters)
            {
                throw new BusinessException(
                    Common.ErrorCodes.Validation,
                    "EPSG:4326 ve EPSG:3857 koordinatları birbiriyle uyumsuz.");
            }
            return from4326;
        }

        if (has4326)
            return FromWgs84(longitude!.Value, latitude!.Value);

        if (has3857)
            return FromWebMercator(xMercator!.Value, yMercator!.Value);

        throw new BusinessException(
            Common.ErrorCodes.Validation,
            "Koordinat bilgisi eksik. EPSG:4326 (longitude/latitude) veya EPSG:3857 (xMercator/yMercator) gönderilmelidir.");
    }

    private static void ValidateWgs84(double lon, double lat)
    {
        if (lon is < -180 or > 180)
            throw new BusinessException(Common.ErrorCodes.Validation, "Boylam -180 ile 180 arasında olmalıdır.");
        if (lat is < -90 or > 90)
            throw new BusinessException(Common.ErrorCodes.Validation, "Enlem -90 ile 90 arasında olmalıdır.");
    }

    private static (double X, double Y) LonLatToMercator(double lon, double lat)
    {
        var x = lon * Math.PI / 180.0 * EarthRadiusMeters;
        var latClamped = Math.Max(-85.05112878, Math.Min(85.05112878, lat));
        var y = Math.Log(Math.Tan((90.0 + latClamped) * Math.PI / 360.0)) * EarthRadiusMeters;
        return (x, y);
    }

    private static (double Lon, double Lat) MercatorToLonLat(double x, double y)
    {
        var lon = x / EarthRadiusMeters * 180.0 / Math.PI;
        var lat = Math.Atan(Math.Sinh(y / EarthRadiusMeters)) * 180.0 / Math.PI;
        return (lon, lat);
    }
}
