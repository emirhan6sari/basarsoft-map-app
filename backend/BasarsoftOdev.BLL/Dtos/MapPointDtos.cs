namespace BasarsoftOdev.BLL.Dtos;

public class MapPointCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public double? Longitude { get; set; }
    public double? Latitude { get; set; }
    public double? XMercator { get; set; }
    public double? YMercator { get; set; }
}

public class MapPointUpdateDto : MapPointCreateDto;

public class MapPointResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public double Longitude { get; set; }
    public double Latitude { get; set; }
    public double XMercator { get; set; }
    public double YMercator { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
    public string? CreatedByDisplayName { get; set; }
    public DateTime CreatedAt { get; set; }
}
