namespace BasarsoftOdev.Domain.ValueObjects;

/// <summary>
/// Bir noktanın hem WGS84 (EPSG:4326) hem Web Mercator (EPSG:3857) temsilini taşır.
/// Genişletilebilir yapı: ileride farklı SRID'ler eklenebilir.
/// </summary>
public sealed record GeoCoordinateSet(
    double Longitude,
    double Latitude,
    double XMercator,
    double YMercator);
