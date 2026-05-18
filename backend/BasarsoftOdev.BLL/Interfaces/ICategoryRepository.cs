using BasarsoftOdev.Domain.Entities;

namespace BasarsoftOdev.BLL.Interfaces;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Category?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Category?> FindByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<Category?> FindBySortOrderAsync(int sortOrder, CancellationToken cancellationToken = default);
    Task<Category> AddAsync(Category entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(Category entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(Category entity, CancellationToken cancellationToken = default);
    Task<int> CountMapPointsByCategoryNameAsync(string categoryName, CancellationToken cancellationToken = default);
    Task RenameMapPointsCategoryAsync(string oldName, string newName, CancellationToken cancellationToken = default);
}
