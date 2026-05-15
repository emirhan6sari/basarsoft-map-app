using System.Text.Json;
using BasarsoftOdev.BLL.Common;
using BasarsoftOdev.BLL.Exceptions;
using BasarsoftOdev.BLL.Interfaces;
using BasarsoftOdev.BLL.Services.GeoImport;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;

namespace BasarsoftOdev.BLL.Services;

public class GeoGeometryParser : IGeoGeometryParser
{
    private const int MaxPoints = 500;

    private static readonly GeoJsonReader GeoJsonReader = new();

    private static readonly WKTReader WktReader = new();

    public IReadOnlyList<GeoImportCandidate> Parse(string format, string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new BusinessException(ErrorCodes.Validation, "İçe aktarım metni boş olamaz.");

        var normalized = format.Trim().ToLowerInvariant();
        var candidates = normalized switch
        {
            "geojson" or "json" => ParseGeoJson(content.Trim()),
            "wkt" => ParseWkt(content.Trim()),
            _ => throw new BusinessException(ErrorCodes.Validation, "Format 'geojson' veya 'wkt' olmalıdır."),
        };

        if (candidates.Count == 0)
            throw new BusinessException(ErrorCodes.Validation, "Geometride kaydedilebilir nokta bulunamadı.");

        if (candidates.Count > MaxPoints)
            throw new BusinessException(ErrorCodes.Validation, $"Tek seferde en fazla {MaxPoints} nokta içe aktarılabilir.");

        return candidates;
    }

    private static List<GeoImportCandidate> ParseWkt(string wkt)
    {
        Geometry geometry;
        try
        {
            geometry = WktReader.Read(wkt);
        }
        catch (Exception ex)
        {
            throw new BusinessException(ErrorCodes.Validation, $"WKT okunamadı: {ex.Message}");
        }

        return ExtractFromGeometry(geometry, properties: null);
    }

    private static List<GeoImportCandidate> ParseGeoJson(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return root.ValueKind switch
            {
                JsonValueKind.Object when root.TryGetProperty("type", out var typeEl) =>
                    ParseGeoJsonObject(root, typeEl.GetString()),
                _ => throw new BusinessException(ErrorCodes.Validation, "Geçersiz GeoJSON yapısı."),
            };
        }
        catch (BusinessException)
        {
            throw;
        }
        catch (JsonException ex)
        {
            throw new BusinessException(ErrorCodes.Validation, $"GeoJSON okunamadı: {ex.Message}");
        }
        catch (Exception ex)
        {
            throw new BusinessException(ErrorCodes.Validation, $"GeoJSON işlenemedi: {ex.Message}");
        }
    }

    private static List<GeoImportCandidate> ParseGeoJsonObject(JsonElement root, string? type)
    {
        return type?.ToLowerInvariant() switch
        {
            "featurecollection" => ParseFeatureCollection(root),
            "feature" => ParseFeature(root),
            "geometrycollection" or "point" or "multipoint" or "linestring" or "multilinestring" or "polygon" or "multipolygon" =>
                ExtractFromGeometry(ReadGeometryElement(root), ReadProperties(root)),
            _ => throw new BusinessException(ErrorCodes.Validation, $"Desteklenmeyen GeoJSON tipi: {type}"),
        };
    }

    private static List<GeoImportCandidate> ParseFeatureCollection(JsonElement root)
    {
        if (!root.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array)
            throw new BusinessException(ErrorCodes.Validation, "FeatureCollection içinde features dizisi bulunamadı.");

        var all = new List<GeoImportCandidate>();
        foreach (var feature in features.EnumerateArray())
        {
            if (feature.ValueKind != JsonValueKind.Object)
                continue;

            if (!feature.TryGetProperty("geometry", out var geomEl) || geomEl.ValueKind == JsonValueKind.Null)
                continue;

            var props = feature.TryGetProperty("properties", out var p) ? p : default;
            all.AddRange(ExtractFromGeometry(ReadGeometryElement(geomEl), props));
        }

        return all;
    }

    private static List<GeoImportCandidate> ParseFeature(JsonElement root)
    {
        if (!root.TryGetProperty("geometry", out var geomEl) || geomEl.ValueKind == JsonValueKind.Null)
            throw new BusinessException(ErrorCodes.Validation, "Feature geometrisi eksik.");

        var props = root.TryGetProperty("properties", out var p) ? p : default;
        return ExtractFromGeometry(ReadGeometryElement(geomEl), props);
    }

    private static Geometry ReadGeometryElement(JsonElement element)
    {
        try
        {
            return GeoJsonReader.Read<Geometry>(element.GetRawText());
        }
        catch (Exception ex)
        {
            throw new BusinessException(ErrorCodes.Validation, $"Geometri okunamadı: {ex.Message}");
        }
    }

    private static JsonElement? ReadProperties(JsonElement root)
        => root.TryGetProperty("properties", out var p) && p.ValueKind == JsonValueKind.Object ? p : null;

    private static List<GeoImportCandidate> ExtractFromGeometry(Geometry geometry, JsonElement? properties)
    {
        var coords = new List<Coordinate>();
        CollectCoordinates(geometry, coords);

        var name = TryReadProperty(properties, "name", "Name", "title", "Title");
        var number = TryReadProperty(properties, "number", "Number", "code", "Code");
        var category = TryReadProperty(properties, "category", "Category", "type", "Type");
        var description = TryReadProperty(properties, "description", "Description");

        return coords.Select(c => new GeoImportCandidate
        {
            Longitude = c.X,
            Latitude = c.Y,
            Name = name,
            Number = number,
            Category = category,
            Description = description,
        }).ToList();
    }

    private static void CollectCoordinates(Geometry geometry, ICollection<Coordinate> target)
    {
        switch (geometry)
        {
            case Point p:
                target.Add(p.Coordinate);
                break;
            case MultiPoint mp:
                foreach (var g in mp.Geometries)
                    CollectCoordinates(g, target);
                break;
            case LineString ls:
                AddUniqueVertices(ls.Coordinates, target);
                break;
            case MultiLineString mls:
                foreach (var g in mls.Geometries)
                    CollectCoordinates(g, target);
                break;
            case Polygon poly:
                AddUniqueVertices(poly.ExteriorRing.Coordinates, target);
                foreach (var hole in poly.InteriorRings)
                    AddUniqueVertices(hole.Coordinates, target);
                break;
            case MultiPolygon mpoly:
                foreach (var g in mpoly.Geometries)
                    CollectCoordinates(g, target);
                break;
            case GeometryCollection gc:
                foreach (var g in gc.Geometries)
                    CollectCoordinates(g, target);
                break;
            default:
                throw new BusinessException(ErrorCodes.Validation, $"Desteklenmeyen geometri tipi: {geometry.GeometryType}");
        }
    }

    private static void AddUniqueVertices(Coordinate[] coordinates, ICollection<Coordinate> target)
    {
        Coordinate? prev = null;
        foreach (var c in coordinates)
        {
            if (prev is not null && NearlyEqual(prev, c))
                continue;
            target.Add(c);
            prev = c;
        }
    }

    private static bool NearlyEqual(Coordinate a, Coordinate b, double tol = 1e-9)
        => Math.Abs(a.X - b.X) < tol && Math.Abs(a.Y - b.Y) < tol;

    private static string? TryReadProperty(JsonElement? props, params string[] keys)
    {
        if (props is null or { ValueKind: not JsonValueKind.Object })
            return null;

        foreach (var key in keys)
        {
            if (!props.Value.TryGetProperty(key, out var el))
                continue;

            var text = el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Number => el.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => null,
            };

            if (!string.IsNullOrWhiteSpace(text))
                return text.Trim();
        }

        return null;
    }
}
