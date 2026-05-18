using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

/// <summary>Kategori salt okunur erişim (ISP).</summary>
public interface ICategoryQueryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Category?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Category?> FindByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<Category?> FindBySortOrderAsync(int sortOrder, CancellationToken cancellationToken = default);
}
