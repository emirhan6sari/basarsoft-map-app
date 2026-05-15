namespace BasarsoftOdev.Domain.Entities;

/// <summary>Harita noktası kategorileri — DB'den çekilir, frontend dropdown'u besler.</summary>
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public int SortOrder { get; set; }
}
