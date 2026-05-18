namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>Kategori adı ile map_points ilişkisi (ISP — kategori CRUD'dan ayrı).</summary>
public interface IMapPointCategoryLinkRepository
{
    Task<int> CountMapPointsByCategoryNameAsync(string categoryName, CancellationToken cancellationToken = default);
    Task RenameMapPointsCategoryAsync(string oldName, string newName, CancellationToken cancellationToken = default);
}
