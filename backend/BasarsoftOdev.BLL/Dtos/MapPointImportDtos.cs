namespace BasarsoftOdev.BLL.Dtos;

public class MapPointImportRequestDto
{
    /// <summary>geojson veya wkt</summary>
    public string Format { get; set; } = "geojson";

    public string Content { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string NamePrefix { get; set; } = "İçe Aktarım";

    public string NumberPrefix { get; set; } = "IMP";

    public string? DefaultDescription { get; set; }
}

public class MapPointImportResultDto
{
    public int CreatedCount { get; set; }
    public int SkippedCount { get; set; }
    public IReadOnlyList<MapPointResponseDto> Created { get; set; } = [];
    public IReadOnlyList<MapPointImportSkipDto> Skipped { get; set; } = [];
}

public class MapPointImportSkipDto
{
    public int Index { get; set; }
    public double Longitude { get; set; }
    public double Latitude { get; set; }
    public string Reason { get; set; } = string.Empty;
}
