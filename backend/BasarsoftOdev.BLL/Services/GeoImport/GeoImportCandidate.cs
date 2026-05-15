namespace BasarsoftOdev.BLL.Services.GeoImport;

public sealed class GeoImportCandidate
{
    public double Longitude { get; init; }
    public double Latitude { get; init; }
    public string? Name { get; init; }
    public string? Number { get; init; }
    public string? Category { get; init; }
    public string? Description { get; init; }
}
